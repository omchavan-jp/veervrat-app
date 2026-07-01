"use client"

import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"

import { cn } from "@/lib/utils"

// Accessible radio group (role=radiogroup + roving focus from base-ui). Pair with
// <Fieldset>/<FieldLabel> for the group caption so it is not a bare <p>.
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-transparent outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-accent",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-indicator"
        className="size-2.5 rounded-full bg-accent"
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
