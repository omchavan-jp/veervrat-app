'use client';

import { Field as FieldPrimitive } from '@base-ui/react/field';
import { Fieldset as FieldsetPrimitive } from '@base-ui/react/fieldset';

import { cn } from '@/lib/utils';

// base-ui Field wires label<->control association and aria-invalid/aria-describedby
// automatically: <Field.Root><FieldLabel/><Control/><FieldError/></Field.Root>.
// This kills the pervasive raw <label> (no htmlFor) + <input> (no id) pattern.
function Field({ className, ...props }: FieldPrimitive.Root.Props) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: FieldPrimitive.Label.Props) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn('text-sm leading-none font-medium select-none', className)}
      {...props}
    />
  );
}

// Render an Input/Textarea/Select as the field control so base-ui owns the id wiring:
//   <FieldControl render={<Input />} />
function FieldControl({ ...props }: FieldPrimitive.Control.Props) {
  return <FieldPrimitive.Control data-slot="field-control" {...props} />;
}

function FieldDescription({ className, ...props }: FieldPrimitive.Description.Props) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn('text-[13px] text-muted', className)}
      {...props}
    />
  );
}

// Error text rendered with the danger token and associated via aria-describedby.
// Pass `match` to gate on a native-validity key, or control via the Field state.
function FieldError({ className, ...props }: FieldPrimitive.Error.Props) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      className={cn('text-[13px] text-danger', className)}
      {...props}
    />
  );
}

function Fieldset({ className, ...props }: FieldsetPrimitive.Root.Props) {
  return (
    <FieldsetPrimitive.Root
      data-slot="fieldset"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function FieldsetLegend({ className, ...props }: FieldsetPrimitive.Legend.Props) {
  return (
    <FieldsetPrimitive.Legend
      data-slot="fieldset-legend"
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  );
}

export { Field, FieldLabel, FieldControl, FieldDescription, FieldError, Fieldset, FieldsetLegend };
