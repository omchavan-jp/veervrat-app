import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Capability } from '@prisma/client';
import { CapabilitiesRepository } from './capabilities.repository';
import type { FeatureMode } from '../../common/permissions/types';

/**
 * Resolves the two halves of a capability decision.
 *
 *   featureMode — does this feature exist in THIS ENVIRONMENT?  (env config)
 *   grants      — may THIS PERSON use it here?                  (database)
 *
 * Grants are read per request rather than cached on the session. That is deliberate: a session
 * carries roles because they change rarely and by a deliberate act, whereas revoking a
 * capability must take effect immediately rather than at the granted user's next login. These
 * are low-traffic paths, so the read costs little and buys correctness on revoke.
 */
@Injectable()
export class CapabilitiesService {
  constructor(
    private readonly repository: CapabilitiesRepository,
    private readonly config: ConfigService,
  ) {}

  async grantsFor(userId: string): Promise<Capability[]> {
    return this.repository.listForUser(userId);
  }

  /**
   * ⚠️ CONTENT_EDIT is refused on production outright, whatever the environment config or a
   * user's grants say (O7: content editor never on prod, for anyone). Enforced here rather than
   * only in the admin UI, so a grant that could never take effect cannot be issued and then
   * silently do nothing.
   */
  featureMode(capability: Capability): FeatureMode {
    if (capability === 'CONTENT_EDIT') {
      // Two independent gates, and prod must fail both. ENVIRONMENT is named explicitly rather
      // than inferred: NODE_ENV is `production` on UAT too, and sniffing the cookie domain or
      // hostname would break silently the first time a host changed.
      if (this.config.get<string>('ENVIRONMENT') === 'prod') return 'off';
      return this.config.get<boolean>('CONTENT_EDIT_ENABLED', false) ? 'granted' : 'off';
    }

    // Unrecognised values fail closed — a typo in config must not open a gated feature.
    const raw = this.config.get<string>('FEEDBACK_MODE', 'off');
    return raw === 'granted' ? 'granted' : 'off';
  }
}
