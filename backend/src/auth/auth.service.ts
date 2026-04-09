import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { google } from 'googleapis';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: Partial<User>; token: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: Partial<User>; token: string }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async validateUser(payload: any): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async getGoogleAuthUrl(mode: string): Promise<string> {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new BadRequestException('Missing Google OAuth configuration in backend environment variables');
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/api/auth/google/callback';

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    const scopes = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly'];

    const state = mode; // or generate random

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });

    return url;
  }

  async handleGoogleCallback(code: string, state: string): Promise<{ user: Partial<User>; token: string }> {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new BadRequestException('Missing Google OAuth configuration in backend environment variables');
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/api/auth/google/callback';

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

    const { data } = await oauth2.userinfo.get();

    const { id: googleId, email, name, picture } = data;

    let user = await this.userRepository.findOne({ where: { googleId } });

    if (!user) {
      user = await this.userRepository.findOne({ where: { email } });

      if (user) {
        // link
        user.googleId = googleId;
        user.googleRefreshToken = tokens.refresh_token;
        await this.userRepository.save(user);
      } else {
        if (state === 'signup') {
          // create new
          const [firstName, lastName] = name.split(' ');
          user = this.userRepository.create({
            email,
            firstName,
            lastName,
            googleId,
            googleRefreshToken: tokens.refresh_token,
          });
          await this.userRepository.save(user);
        } else {
          throw new UnauthorizedException('Account does not exist. Please sign up first.');
        }
      }
    } else {
      // update refresh token if needed
      if (tokens.refresh_token) {
        user.googleRefreshToken = tokens.refresh_token;
        await this.userRepository.save(user);
      }
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
}