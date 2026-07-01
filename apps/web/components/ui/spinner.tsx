import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  // motion-reduce: drop the spin so it respects prefers-reduced-motion (the global
  // rule also caps duration, but disabling the animation outright avoids a static
  // partial-arc reading as a broken graphic).
  "inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent motion-reduce:animate-none",
  {
    variants: {
      size: {
        sm: "size-3.5 border-2",
        md: "size-5 border-2",
        lg: "size-8 border-[3px]",
      },
      tone: {
        accent: "text-accent",
        current: "text-current",
        muted: "text-muted",
      },
    },
    defaultVariants: { size: "md", tone: "accent" },
  }
)

interface SpinnerProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof spinnerVariants> {
  /** Accessible label announced to assistive tech. Defaults to "Loading". */
  label?: string
}

function Spinner({ className, size, tone, label = "Loading", ...props }: SpinnerProps) {
  return (
    <span data-slot="spinner" role="status" {...props}>
      <span className={cn(spinnerVariants({ size, tone }), className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export { Spinner, spinnerVariants }
