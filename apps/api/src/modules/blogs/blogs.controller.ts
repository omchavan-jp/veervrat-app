import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Post()
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateBlogDto) {
    return this.blogsService.create(user, dto);
  }

  @Get()
  @UseGuards(OptionalSessionGuard)
  list(@Query('cursor') cursor?: string) {
    return this.blogsService.list(cursor);
  }

  @Get('mine')
  @UseGuards(SessionGuard)
  listMine(@CurrentUser() user: SessionUser, @Query('cursor') cursor?: string) {
    return this.blogsService.listMine(user, cursor);
  }

  // Before :id so "search" isn't swallowed as an id.
  @Get('search')
  @UseGuards(OptionalSessionGuard)
  search(@Query('q') q: string) {
    return this.blogsService.search(q ?? '');
  }

  @Get(':id')
  @UseGuards(OptionalSessionGuard)
  getOne(@CurrentUser() user: SessionUser | undefined, @Param('id') id: string) {
    return this.blogsService.getOne(user, id);
  }

  @Patch(':id')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: UpdateBlogDto) {
    return this.blogsService.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.blogsService.remove(user, id);
  }

  // ─── Comments ──────────────────────────────────────────────────────────────────

  @Post(':id/comments')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.CREATED)
  addComment(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: CreateCommentDto) {
    return this.blogsService.addComment(user, id, dto.body);
  }

  @Delete(':id/comments/:cid')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  deleteComment(@CurrentUser() user: SessionUser, @Param('id') id: string, @Param('cid') cid: string) {
    return this.blogsService.deleteComment(user, id, cid);
  }

  @Post(':id/comments/:cid/hide')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  hideComment(@CurrentUser() user: SessionUser, @Param('id') id: string, @Param('cid') cid: string) {
    return this.blogsService.hideComment(user, id, cid);
  }

  @Post(':id/comments/:cid/report')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  reportComment(@CurrentUser() user: SessionUser, @Param('id') id: string, @Param('cid') cid: string) {
    return this.blogsService.reportComment(user, id, cid);
  }
}
