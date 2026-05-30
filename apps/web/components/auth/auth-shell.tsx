import { Logo } from './logo';

type HeroContent = {
  eyebrow: string;
  heading: string;
  devanagari: string;
  gloss?: string;
};

type AuthShellProps = {
  hero: HeroContent;
  children: React.ReactNode;
};

export function AuthShell({ hero, children }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left panel — brand + hero */}
      <div className="flex flex-col justify-between border-b border-border bg-bg px-8 py-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-12">
        <Logo />

        <div className="mt-6 lg:mt-20">
          <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            {hero.eyebrow}
          </div>
          <h1 className="mb-5 font-display text-[clamp(34px,3.6vw,48px)] leading-[1.1] tracking-tight">
            {hero.heading}
          </h1>
          <p className="mb-2 font-deva text-xl leading-relaxed text-accent-2">
            {hero.devanagari}
          </p>
          {hero.gloss && (
            <p className="max-w-[380px] text-[15px] italic text-muted">
              {hero.gloss}
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-muted lg:mt-0">
          <span>est. 1962 · Pune</span>
          <span>v0.2</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col justify-center bg-surface px-7 py-10 lg:px-14">
        <div className="mx-auto w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
