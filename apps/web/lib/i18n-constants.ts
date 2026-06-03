export const SUPPORTED_LOCALES = ['en', 'mr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
