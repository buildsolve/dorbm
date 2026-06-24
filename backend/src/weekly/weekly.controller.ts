import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WeeklyService } from './weekly.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('weekly')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('weekly')
export class WeeklyController {
  constructor(private svc: WeeklyService) {}

  // Recipe stages
  @Get('stages/:recipeId')
  getStages(@Param('recipeId') recipeId: string) { return this.svc.getStages(recipeId); }

  @Put('stages/:recipeId')
  upsertStages(@Param('recipeId') recipeId: string, @Body() dto: { stages: any[] }) {
    return this.svc.upsertStages(recipeId, dto.stages ?? []);
  }

  // Weekly plans
  @Get('plans')
  listPlans() { return this.svc.listPlans(); }

  @Get('plans/:id')
  getPlan(@Param('id') id: string) { return this.svc.getPlan(id); }

  @Post('plans')
  createPlan(@Body() dto: any) { return this.svc.createPlan(dto); }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: any) { return this.svc.updatePlan(id, dto); }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) { return this.svc.deletePlan(id); }

  @Patch('plans/:id/complete')
  completePlan(@Param('id') id: string) { return this.svc.completePlan(id); }

  // Auto-generate tasks
  @Post('plans/:id/generate')
  generateTasks(@Param('id') id: string, @Body() dto: { entries: any[] }) {
    return this.svc.generateTasks(id, dto.entries ?? []);
  }

  @Delete('plans/:id/tasks')
  clearTasks(@Param('id') id: string) { return this.svc.clearTasks(id); }

  // Task CRUD
  @Post('plans/:id/tasks')
  addTask(@Param('id') planId: string, @Body() dto: any) { return this.svc.addTask(planId, dto); }

  @Patch('tasks/:taskId')
  updateTask(@Param('taskId') taskId: string, @Body() dto: any) { return this.svc.updateTask(taskId, dto); }

  @Delete('tasks/:taskId')
  deleteTask(@Param('taskId') taskId: string) { return this.svc.deleteTask(taskId); }
}
