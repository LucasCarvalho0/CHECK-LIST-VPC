import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';

@Module({ imports: [ReportsModule], controllers: [PdfController], providers: [PdfService], exports: [PdfService] })
export class PdfModule {}
