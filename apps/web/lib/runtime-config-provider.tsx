'use client';

import { createContext, useContext } from 'react';
import { setClientRuntimeConfig, type RuntimeConfig } from './runtime-config';
import { initBrowserSentry } from './sentry-client';

const RuntimeConfigContext = createContext<RuntimeConfig | undefined>(undefined);

/**
 * Installs the server-resolved config for the browser.
 *
 * The module-level singleton is set during render rather than in an effect, because
 * `lib/api/client.ts` may be called before effects have run (a query firing during the first
 * paint), and a request that silently fell back to localhost is exactly the failure this
 * whole change exists to prevent.
 *
 * Sentry is initialised from here too, for the same reason: this is the earliest point in the
 * client the DSN is known at all.
 */
export function RuntimeConfigProvider({
  config,
  children,
}: {
  config: RuntimeConfig;
  children: React.ReactNode;
}) {
  setClientRuntimeConfig(config);
  initBrowserSentry(config);

  return <RuntimeConfigContext.Provider value={config}>{children}</RuntimeConfigContext.Provider>;
}

/** For components that want the config reactively. Non-component callers use getRuntimeConfig(). */
export function useRuntimeConfig(): RuntimeConfig {
  const config = useContext(RuntimeConfigContext);
  if (!config) {
    throw new Error('useRuntimeConfig must be used within RuntimeConfigProvider');
  }
  return config;
}
