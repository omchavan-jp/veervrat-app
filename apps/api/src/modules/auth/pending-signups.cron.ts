import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthRepository } from './auth.repository';

/**
 * Removes expired pending signups.
 *
 * A pending signup holds a date of birth across the Google round trip. Most are consumed within
 * seconds; the ones left behind are abandoned attempts, and each is a small amount of personal
 * data with no purpose. Data with no purpose is a liability rather than an asset
 * (spec/decisions/21_age-and-personal-attributes.md), so they are cleared rather than left to
 * accumulate.
 *
 * Expiry is enforced on read as well — this is housekeeping, not a security control.
 */
@Injectable()
export class PendingSignupsCron {
  private readonly logger = new Logger(PendingSignupsCron.name);

  constructor(private readonly authRepository: AuthRepository) {}

  @Cron('15 3 * * *')
  async purgeExpired(): Promise<void> {
    const removed = await this.authRepository.deleteExpiredPendingSignups();
    if (removed > 0) {
      this.logger.log({ msg: 'purged expired pending signups', count: removed });
    }
  }
}
