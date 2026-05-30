import Link from 'next/link';
import { Logo } from '@/components/auth/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-20 text-center">
      <div className="mb-16">
        <Logo />
      </div>

      <div className="mb-6 font-display text-[clamp(80px,12vw,144px)] leading-none tracking-tighter text-accent tabular-nums">
        404
      </div>

      <div className="mb-3 max-w-[580px] font-deva text-[22px] leading-relaxed">
        न हि मार्गोऽयं अद्यापि चलितः।
      </div>

      <div className="mb-6 max-w-[480px] text-sm italic text-muted">
        na hi mārgo&rsquo;yam adyāpi calitaḥ
      </div>

      <div className="mb-2 max-w-[520px] text-[15px] leading-relaxed">
        This path has not yet been walked. The page you were looking for does not
        exist — or it has moved on.
      </div>

      <div className="mb-12 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        — a fragment, paraphrased
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-8 py-3.5 text-[15px] font-medium text-bg hover:bg-accent-hover"
        >
          Return to your practice
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl border border-border-strong bg-transparent px-8 py-3.5 text-[15px] font-medium text-fg hover:bg-fg hover:text-bg"
        >
          Go to login
        </Link>
      </div>
    </div>
  );
}
