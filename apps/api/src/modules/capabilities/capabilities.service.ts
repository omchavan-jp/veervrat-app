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
    switch (capability) {
      case 'CONTENT_EDIT': {
        // Two independent gates, and prod must fail both. ENVIRONMENT is named explicitly rather
        // than inferred: NODE_ENV is `production` on UAT too, and sniffing the cookie domain or
        // hostname would break silently the first time a host changed.
        if (this.config.get<string>('ENVIRONMENT') === 'prod') return 'off';
        return this.config.get<boolean>('CONTENT_EDIT_ENABLED', false) ? 'granted' : 'off';
      }

      /**
       * Content suggestions have **no environment gate**, and that is a decision, not an omission.
       *
       * The per-user grant is the whole gate: an environment where suggestions should be off is
       * an environment where nobody has been granted the capability. Adding a second switch that
       * must be set in three Terraform files to work is precisely how `CONTENT_EDIT_ENABLED`
       * became inert — read by the code, set in no infrastructure, so the capability could be
       * granted and silently do nothing (#40, ops/audit/README.md). One gate that cannot be
       * mis-wired beats two that can.
       *
       * Unlike the content editor this is safe on production: a suggestion is inert data. It
       * changes nothing a visitor sees, which is the reason the editor is barred there.
       */
      case 'CONTENT_SUGGEST':
        return 'granted';

      case 'FEEDBACK_WIDGET': {
        // Unrecognised values fail closed — a typo in config must not open a gated feature.
        return this.config.get<string>('FEEDBACK_MODE', 'off') === 'granted' ? 'granted' : 'off';
      }
    }
  }
}
