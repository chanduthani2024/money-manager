import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BankStatementImportService } from './bank-statement-import.service';

@Controller('bank-statements')
@UseGuards(JwtAuthGuard)
export class BankStatementImportController {
  constructor(private readonly importService: BankStatementImportService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only PDF files are allowed'), false);
      }
    },
  }))
  async importStatement(
    @Request() req: any,
    @UploadedFile() file: any,
    @Body() body: { bankSettingsId: string },
  ) {
    if (!file) throw new BadRequestException('No PDF file uploaded');
    if (!body.bankSettingsId) throw new BadRequestException('bankSettingsId is required');

    return this.importService.importFromPdf(
      req.user.id,
      file.buffer,
      parseInt(body.bankSettingsId, 10),
    );
  }

  @Get('history')
  getHistory(@Request() req: any) {
    return this.importService.getImportHistory(req.user.id);
  }
}
