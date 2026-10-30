# ui

## Overview

Reusable styled UI primitives and async state components. Reusable toggle, tooltip, and typography primitives.

## Interface

- Alert, AlertTitle, AlertDescription, AlertAction [alert.tsx:Alert]; Avatar, AvatarImage, AvatarFallback [avatar.tsx:Avatar]; Badge, badgeVariants and BadgeProps [badge.tsx:Badge].
- Button and buttonVariants [button.tsx:Button]; Calendar and CalendarDayButton [calendar.tsx:Calendar]; Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent [card.tsx:Card].
- Collapsible, CollapsibleTrigger, CollapsiblePanel [collapsible.tsx:Collapsible]; DatePicker [date-picker.tsx:DatePicker]; Dialog and DialogPrimitive [dialog.tsx:Dialog]; EmptyState [empty-state.tsx:EmptyState].
- Field, FieldLabel, FieldControl, FieldDescription, FieldError, Fieldset, FieldsetLegend [field.tsx:Field]; Input and inputVariants [input.tsx:Input]; Label [label.tsx:Label].
- Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger [popover.tsx:Popover]; QueryBoundary [query-boundary.tsx:QueryBoundary]; RadioGroup and RadioGroupItem [radio-group.tsx:RadioGroup].
- Select, SelectValue, SelectGroup, SelectTrigger, SelectContent, SelectItem [select.tsx:Select]; Separator [separator.tsx:Separator]; Skeleton, SkeletonCard, SkeletonList [skeleton.tsx:Skeleton].
- Spinner and spinnerVariants [spinner.tsx:Spinner]; StatusBadge [status-badge.tsx:StatusBadge]; Switch [switch.tsx:Switch]; Tabs and TabItem [tabs.tsx:Tabs]; Textarea [textarea.tsx:Textarea]; ToastProvider, Toaster, useToast [toast.tsx:useToast].
- Exports ToggleGroup, ToggleGroupItem and toggleItemVariants [toggle-group.tsx:ToggleGroupItem]; Tooltip, TooltipProvider, TooltipTrigger and TooltipContent [tooltip.tsx:TooltipContent]; PageTitle, SectionHeading and SectionLabel [typography.tsx:PageTitle].

## Invariants

- QueryBoundary prioritizes loading, error, then supplied empty state, then children [query-boundary.tsx:QueryBoundary].
- DatePicker exchanges YYYY-MM-DD strings, disables dates after max, and closes after selection [date-picker.tsx:DatePicker].
- DatePicker starts its calendar range in January 1920. It opens on a valid selected date, then a valid defaultMonth, otherwise a month 25 years before max when max is supplied [date-picker.tsx:DatePicker].
- Button disables while loading and assigns link role when nativeButton is false unless overridden [button.tsx:Button].
- Field primitives delegate label and validation associations to Base UI [field.tsx:FieldControl]; skeleton is decorative and spinner exposes status label [skeleton.tsx:Skeleton] [spinner.tsx:Spinner].
- Unknown status falls back to NOT_STARTED [status-badge.tsx:StatusBadge]; Tabs are controlled through active and onChange [tabs.tsx:Tabs].
- Default toggle items have a minimum 44px height and pressed state styling [toggle-group.tsx:toggleItemVariants]; tooltip content is portaled with default offset 6 [tooltip.tsx:TooltipContent].
- Typography defaults to h1, h2 and div respectively with optional semantic alternatives [typography.tsx:PageTitle].

## Side Effects

- CalendarDayButton focuses its DOM button when focused modifier changes [calendar.tsx:CalendarDayButton].
- DatePicker invokes onChange on selection [date-picker.tsx:DatePicker]; Tabs invokes onChange on click [tabs.tsx:Tabs]; toast manager renders notifications in a portal [toast.tsx:Toaster].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
