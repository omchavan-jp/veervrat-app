import { CheckCircle2, AlertCircle } from 'lucide-react';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type StatusBannerProps = {
  variant: 'success' | 'error';
  title: string;
  description: string;
};

// Built on the Alert primitive (gets role="alert" for free) with semantic tokens
// — success uses the success token, error uses danger, instead of brand accent +
// hardcoded rgba() and bare ✓/! glyphs.
export function StatusBanner({ variant, title, description }: StatusBannerProps) {
  const Icon = variant === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <Alert
      variant={variant === 'error' ? 'destructive' : 'default'}
      className={cn(
        'mb-6',
        variant === 'success' && 'border-success/40 bg-success/10 text-success',
        variant === 'error' && 'border-destructive/40 bg-destructive/10',
      )}
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription
        className={variant === 'success' ? 'text-success/90' : undefined}
      >
        {description}
      </AlertDescription>
    </Alert>
  );
}
