import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { DailyPdfDto } from '../reports/reports.dto';
import { PdfService } from './pdf.service';

@ApiTags('pdf')
@ApiBearerAuth()
@Controller()
export class PdfController {
  constructor(private pdf: PdfService) {}

  /** ?download=1 força download; sem ele o PDF abre inline (pré-visualização/impressão). */
  @Get('checklists/:id/pdf')
  async one(@Param('id', ParseUUIDPipe) id: string, @Query('download') download: string, @Res() res: Response) {
    const { buffer, filename } = await this.pdf.checklistPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @HttpCode(200)
  @Post('reports/daily/pdf')
  async daily(@Body() dto: DailyPdfDto, @Query('download') download: string, @Res() res: Response) {
    const { buffer, filename, pages } = await this.pdf.dailyPdf(dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      'X-Total-Pages': String(pages.totalPages),
      'X-Total-Vehicles': String(pages.vehicles),
    });
    res.end(buffer);
  }
}
