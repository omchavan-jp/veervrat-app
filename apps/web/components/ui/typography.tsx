import { cn } from '@/lib/utils';

// Typography primitives that encode the canonical scale from
// documentation/15a_UI-Consistency-Rules.md §1–2, so screens stop re-typing (and
// re-drifting) the class strings. Use these for the three most-drifted roles; for
// one-off body/caption text the raw classes are fine.

// The single <h1> per page. Responsive, serif, normal weight (the serif carries the
// emphasis — never bold a display heading). There is exactly ONE size for this.
export function PageTitle({
  className,
  as: Tag = 'h1',
  ...props
}: React.ComponentProps<'h1'> & { as?: 'h1' | 'h2' }) {
  return (
    <Tag
      className={cn(
        'font-display text-[clamp(26px,3vw,36px)] font-normal leading-tight tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

// Section heading (<h2>). Serif, normal weight.
export function SectionHeading({
  className,
  as: Tag = 'h2',
  ...props
}: React.ComponentProps<'h2'> & { as?: 'h2' | 'h3' }) {
  return (
    <Tag
      className={cn('font-display text-[20px] font-normal tracking-tight', className)}
      {...props}
    />
  );
}

// The mono uppercase eyebrow/kicker that labels a section. Muted by default.
export function SectionLabel({
  className,
  as: Tag = 'div',
  ...props
}: React.ComponentProps<'div'> & { as?: 'div' | 'h2' | 'h3' }) {
  return (
    <Tag
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.12em] text-muted',
        className,
      )}
      {...props}
    />
  );
}
