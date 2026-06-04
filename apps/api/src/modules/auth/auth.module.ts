import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { SessionGuard } from './guards/session.guard';
import { OptionalSessionGuard } from './guards/optional-session.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PassportModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, GoogleStrategy, SessionGuard, OptionalSessionGuard],
  exports: [AuthService, SessionGuard, OptionalSessionGuard],
})
export class AuthModule {}
