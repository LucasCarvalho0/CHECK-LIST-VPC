import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { CancelChecklistDto, CreateChecklistDto, ListChecklistsDto, UpdateChecklistDto } from './checklists.dto';
import { ChecklistsService } from './checklists.service';

@ApiTags('checklists')
@ApiBearerAuth()
@Controller('checklists')
export class ChecklistsController {
  constructor(private svc: ChecklistsService) {}

  @Roles('ADMIN', 'OPERATOR')
  @Post()
  create(@Body() dto: CreateChecklistDto, @CurrentUser() u: AuthUser) { return this.svc.create(dto, u); }

  @Get()
  list(@Query() q: ListChecklistsDto) { return this.svc.findAll(q); }

  // Rota estática ANTES de ':id'
  @Get('search/chassis/:chassis')
  searchByChassis(@Param('chassis') chassis: string) { return this.svc.searchByChassis(chassis); }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }

  @Get(':id/history')
  @Roles('ADMIN')
  history(@Param('id', ParseUUIDPipe) id: string) { return this.svc.history(id); }

  // A regra fina (finalizado => só ADMIN; VIEWER nunca) é aplicada no service.
  @Roles('ADMIN', 'OPERATOR')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateChecklistDto, @CurrentUser() u: AuthUser) {
    return this.svc.update(id, dto, u);
  }

  @Roles('ADMIN', 'OPERATOR')
  @HttpCode(200)
  @Post(':id/finalize')
  finalize(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.svc.finalize(id, u); }

  @Roles('ADMIN')
  @HttpCode(200)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelChecklistDto, @CurrentUser() u: AuthUser) {
    return this.svc.cancel(id, dto, u);
  }
}
