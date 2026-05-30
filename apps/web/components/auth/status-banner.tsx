import { cn } from '@/lib/utils';

type StatusBannerProps = {
  variant: 'success' | 'error';
  title: string;
  description: string;
};

export function StatusBanner({ variant, title, description }: StatusBannerProps) {
  return (
    <div
      className={cn(
        'mb-6 flex gap-4 rounded-xl p-5',
        variant === 'success' &&
          'border border-[rgba(47,91,79,0.2)] bg-[rgba(47,91,79,0.08)]',
        variant === 'error' &&
          'border border-[rgba(192,81,47,0.2)] bg-[rgba(192,81,47,0.08)]',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-bg',
          variant === 'success' && 'bg-accent-2',
          variant === 'error' && 'bg-accent',
        )}
      >
        {variant === 'success' ? '✓' : '!'}
      </div>
      <div className="text-sm text-fg">
        <strong className="mb-1 block text-[15px]">{title}</strong>
        {description}
      </div>
    </div>
  );
}
