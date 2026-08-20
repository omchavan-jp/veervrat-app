import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { GoogleProfile } from '../types/auth.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string; verified?: boolean }[];
      displayName?: string;
    },
    done: VerifyCallback,
  ): void {
    const primaryEmail = profile.emails?.[0];
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email: primaryEmail?.value ?? '',
      name: profile.displayName ?? null,
      // Absent is treated as NOT verified. Defaulting the other way would let an identity
      // Google itself has not confirmed mark an address verified here.
      emailVerified: primaryEmail?.verified === true,
    };
    done(null, googleProfile);
  }
}
