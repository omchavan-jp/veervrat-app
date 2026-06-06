import { cn } from '@/lib/utils';

export function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border',
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      className={cn('aspect-square h-full w-full object-cover', props.className)}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-accent/10 text-accent font-medium h-full w-full',
        className,
      )}
      {...props}
    />
  );
}
