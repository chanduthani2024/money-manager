import { Controller, Post, Body, UseGuards, Get, Request, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('google')
  async getGoogleAuthUrl(@Query('mode') mode: string, @Res() res: Response) {
    const url = await this.authService.getGoogleAuthUrl(mode);
    return res.redirect(url);
  }

  @Get('google/callback')
  async handleGoogleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      const result = await this.authService.handleGoogleCallback(code, state);
      // redirect to frontend with token
      const redirectUri = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${redirectUri}/auth/callback?token=${result.token}`);
    } catch (error) {
      const redirectUri = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${redirectUri}/login?error=${encodeURIComponent(error.message)}`);
    }
  }
}