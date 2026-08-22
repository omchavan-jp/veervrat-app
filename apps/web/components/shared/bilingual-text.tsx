import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

// Renders bilingual *content* (weakness/sentence/ERC names). Per the product decision
// recorded in spec/20 (revised) + documentation/15_Design-System.md: both scripts are
// shown together, but ORDER FOLLOWS THE ACTIVE UI LOCALE — the selected language is the
// primary line (foreground, larger), the other is the secondary line (muted, below).
// When only one script exists, it stands alone as the primary line.
//
// This is for CONTENT, never for UI chrome — chrome follows the locale via next-intl.
// For compact chips / metadata rows that show a SINGLE language, use `ContentText`.

type Size = 'sm' | 'md' | 'lg' | 'xl';

// Per-size class sets, split by script (Devanagari vs Latin) and role (primary vs
// secondary). Devanagari uses font-deva; Latin uses the display/sans stack.
const SIZES: Record<
  Size,
  {
    devaPrimary: string;
    enPrimary: string;
    devaSecondary: string;
    enSecondary: string;
    gap: string;
  }
> = {
  sm: {
    devaPrimary: 'font-deva text-[15px] leading-snug',
    enPrimary: 'text-[14px]',
    devaSecondary: 'font-deva text-[13px]',
    enSecondary: 'text-[12px]',
    gap: 'mt-0.5',
  },
  md: {
    devaPrimary: 'font-deva text-[18px] leading-snug',
    enPrimary: 'font-display text-[15px]',
    devaSecondary: 'font-deva text-[14px]',
    enSecondary: 'text-[13px]',
    gap: 'mt-0.5',
  },
  lg: {
    devaPrimary: 'font-deva text-[22px] leading-snug',
    enPrimary: 'font-display text-[20px]',
    devaSecondary: 'font-deva text-[15px]',
    enSecondary: 'text-[14px]',
    gap: 'mt-1',
  },
  xl: {
    devaPrimary: 'font-deva text-[clamp(26px,3vw,38px)] leading-tight',
    enPrimary: 'font-display text-[clamp(26px,3vw,38px)] leading-tight',
    devaSecondary: 'font-deva text-[16px]',
    enSecondary: 'text-[16px]',
    gap: 'mt-1.5',
  },
};

export function BilingualText({
  en,
  mr,
  size = 'md',
  as: Wrapper = 'div',
  className,
  secondaryClassName,
}: {
  en: string;
  mr?: string | null;
  size?: Size;
  as?: React.ElementType;
  className?: string;
  secondaryClassName?: string;
}) {
  const locale = useLocale();
  const s = SIZES[size];
  const mrFirst = locale === 'mr';

  // Only one script available → it stands alone as the primary line.
  if (!mr) {
    return <Wrapper className={cn(s.enPrimary, 'tracking-tight', className)}>{en}</Wrapper>;
  }

  const primary = mrFirst ? { text: mr, cls: s.devaPrimary } : { text: en, cls: s.enPrimary };
  const secondary = mrFirst ? { text: en, cls: s.enSecondary } : { text: mr, cls: s.devaSecondary };

  return (
    <Wrapper className={className}>
      <span className={cn('block tracking-tight', primary.cls)}>{primary.text}</span>
      <span className={cn('block text-muted', secondary.cls, secondaryClassName, s.gap)}>
        {secondary.text}
      </span>
    </Wrapper>
  );
}

// Single-language content for compact contexts (chips, metadata rows). Shows ONLY the
// active-locale value; falls back to the other script when the preferred one is missing
// (content is sometimes English-only). Applies font-deva automatically for Devanagari.
export function ContentText({
  en,
  mr,
  as: Wrapper = 'span',
  className,
}: {
  en: string;
  mr?: string | null;
  as?: React.ElementType;
  className?: string;
}) {
  const locale = useLocale();
  const useMr = locale === 'mr' && !!mr;
  const text = useMr ? (mr as string) : en;
  // Fallback case: locale is EN but only MR exists → still Devanagari.
  const isDeva = useMr || (!en && !!mr);
  return <Wrapper className={cn(isDeva && 'font-deva', className)}>{text}</Wrapper>;
}
