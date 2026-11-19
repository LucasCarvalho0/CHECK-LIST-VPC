import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DailyQueryDto, NonconformityQueryDto, SummaryQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}
  @Get('summary') summary(@Query() q: SummaryQueryDto) { return this.svc.summary(q); }
  @Get('daily') daily(@Query() q: DailyQueryDto) { return this.svc.daily(q); }
  @Get('nonconformities') nonconformities(@Query() q: NonconformityQueryDto) { return this.svc.nonconformities(q); }
}
