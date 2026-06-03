'use client';

import { cn } from '@/lib/utils';

function getStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function barClass(index: number, strength: number): string {
  if (index >= strength) return 'bg-border';
  if (strength <= 1) return 'bg-accent';
  if (strength <= 2) return 'bg-[#d4a373]';
  return 'bg-accent-2';
}

export function PasswordStrength({ password }: { password: string }) {
  const strength = getStrength(password);

  return (
    <div className="mt-2.5 flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn('h-1 flex-1 rounded-sm', barClass(i, strength))}
        />
      ))}
    </div>
  );
}
