import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { SaveAnswersDto } from './dto/save-answers.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('tests')
@UseGuards(SessionGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post()
  async create(@Body() dto: CreateTestDto, @CurrentUser() user: SessionUser) {
    const result = await this.testsService.createOrResumeDraft(user.id, dto.weaknessId);
    return result;
  }

  @Patch(':id/answers')
  @HttpCode(HttpStatus.OK)
  async saveAnswers(
    @Param('id') id: string,
    @Body() dto: SaveAnswersDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.testsService.saveAnswers(user.id, id, dto.answers);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submit(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.testsService.submitTest(user.id, id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.testsService.getTest(user.id, id);
  }

  @Get(':id/report')
  async report(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.testsService.getReport(user.id, id);
  }
}
