import { cn } from '@/lib/utils';

// Renders bilingual *content* per the design rule (15_Design-System.md §Bilingual
// Content + spec/20): Devanagari is primary (larger, foreground), English is the
// secondary line (muted) — both ALWAYS shown together, independent of the UI locale.
// When no Marathi is available, English stands alone as the primary line.
//
// This is for CONTENT (weakness/sentence/ERC names), never for UI chrome — chrome
// follows the selected locale via next-intl.

type Size = 'sm' | 'md' | 'lg' | 'xl';

// [Devanagari primary classes, English secondary classes] per size.
const SIZES: Record<Size, { mr: string; en: string; enPrimary: string; gap: string }> = {
  sm: { mr: 'font-deva text-[15px] leading-snug', en: 'text-[12px]', enPrimary: 'text-[14px]', gap: 'mt-0.5' },
  md: { mr: 'font-deva text-[18px] leading-snug', en: 'text-[13px]', enPrimary: 'text-[15px]', gap: 'mt-0.5' },
  lg: { mr: 'font-deva text-[22px] leading-snug', en: 'text-[14px]', enPrimary: 'font-display text-[20px]', gap: 'mt-1' },
  xl: {
    mr: 'font-deva text-[clamp(26px,3vw,38px)] leading-tight',
    en: 'text-[16px]',
    enPrimary: 'font-display text-[clamp(26px,3vw,38px)] leading-tight',
    gap: 'mt-1.5',
  },
};

export function BilingualText({
  en,
  mr,
  size = 'md',
  as: Wrapper = 'div',
  className,
  enClassName,
}: {
  en: string;
  mr?: string | null;
  size?: Size;
  as?: React.ElementType;
  className?: string;
  enClassName?: string;
}) {
  const s = SIZES[size];

  if (!mr) {
    return <Wrapper className={cn(s.enPrimary, 'tracking-tight', className)}>{en}</Wrapper>;
  }

  return (
    <Wrapper className={className}>
      <span className={cn('block tracking-tight', s.mr)}>{mr}</span>
      <span className={cn('block text-muted', s.en, enClassName, s.gap)}>{en}</span>
    </Wrapper>
  );
}
