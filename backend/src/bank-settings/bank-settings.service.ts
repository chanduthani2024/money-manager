import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankSettings } from '../entities/bank-settings.entity';
import { CreateBankSettingsDto, UpdateBankSettingsDto } from './dto/bank-settings.dto';

@Injectable()
export class BankSettingsService {
  constructor(
    @InjectRepository(BankSettings)
    private bankSettingsRepository: Repository<BankSettings>,
  ) {}

  async findAll(userId: number): Promise<BankSettings[]> {
    return this.bankSettingsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number): Promise<BankSettings> {
    const setting = await this.bankSettingsRepository.findOne({ where: { id, userId } });
    if (!setting) throw new NotFoundException('Bank setting not found');
    return setting;
  }

  async create(userId: number, dto: CreateBankSettingsDto): Promise<BankSettings> {
    const setting = this.bankSettingsRepository.create({ ...dto, userId });
    return this.bankSettingsRepository.save(setting);
  }

  async update(userId: number, id: number, dto: UpdateBankSettingsDto): Promise<BankSettings> {
    const setting = await this.findOne(userId, id);
    Object.assign(setting, dto);
    return this.bankSettingsRepository.save(setting);
  }

  async remove(userId: number, id: number): Promise<void> {
    const setting = await this.findOne(userId, id);
    await this.bankSettingsRepository.remove(setting);
  }

  async findByBankName(userId: number, bankName: string): Promise<BankSettings | null> {
    return this.bankSettingsRepository.findOne({
      where: { userId, bankName, isActive: true },
    });
  }
}
