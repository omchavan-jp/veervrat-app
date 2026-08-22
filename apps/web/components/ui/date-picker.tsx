'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerProps = {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  max?: string; // YYYY-MM-DD
  /**
   * Which month the calendar opens on when nothing is selected, as `YYYY-MM-DD`.
   *
   * Without it the picker guesses twenty-five years before `max` — a plausible adult birth year,
   * and a guess buried in a shared component. Callers that know better should say so: an age gate
   * wants the boundary itself, so the limit is visible rather than decades away.
   */
  defaultMonth?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  max,
  defaultMonth,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const validSelected = selected && isValid(selected) ? selected : undefined;

  const maxDate = max ? parse(max, 'yyyy-MM-dd', new Date()) : undefined;
  const openOn = defaultMonth ? parse(defaultMonth, 'yyyy-MM-dd', new Date()) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex w-full items-center gap-2 rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-3 text-base transition-colors focus:outline-none',
          validSelected ? 'text-fg' : 'text-muted',
          open && 'border-accent',
          className,
        )}
      >
        <span className="flex-1 text-left">
          {validSelected ? format(validSelected, 'd MMM yyyy') : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={validSelected}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
          captionLayout="dropdown"
          defaultMonth={
            validSelected ??
            (openOn && isValid(openOn)
              ? openOn
              : maxDate
                ? new Date(maxDate.getFullYear() - 25, maxDate.getMonth())
                : undefined)
          }
          disabled={maxDate ? { after: maxDate } : undefined}
          startMonth={new Date(1920, 0)}
          endMonth={maxDate}
        />
      </PopoverContent>
    </Popover>
  );
}
