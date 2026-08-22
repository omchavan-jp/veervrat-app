import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Switch } from '../../components/ui/switch';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '../../components/ui/collapsible';
import { Field, FieldLabel, FieldControl, FieldError } from '../../components/ui/field';
import { Input } from '../../components/ui/input';

describe('Switch', () => {
  it('renders a switch role and reflects checked state', () => {
    render(<Switch checked aria-label="email notifications" />);
    const sw = screen.getByRole('switch');
    expect(sw).toBeInTheDocument();
    expect(sw).toBeChecked();
  });
});

describe('RadioGroup', () => {
  it('renders radios with a group role', () => {
    render(
      <RadioGroup defaultValue="en" aria-label="language">
        <label>
          <RadioGroupItem value="en" /> English
        </label>
        <label>
          <RadioGroupItem value="mr" /> Marathi
        </label>
      </RadioGroup>,
    );
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });
});

describe('ToggleGroup', () => {
  it('exposes pressed state via aria on the selected item', () => {
    render(
      <ToggleGroup defaultValue={['1']} aria-label="score">
        <ToggleGroupItem value="1">One</ToggleGroupItem>
        <ToggleGroupItem value="2">Two</ToggleGroupItem>
      </ToggleGroup>,
    );
    const one = screen.getByText('One').closest('button')!;
    expect(one).toHaveAttribute('aria-pressed', 'true');
    const two = screen.getByText('Two').closest('button')!;
    expect(two).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggle items meet the 44px mobile touch target via min-h-11', () => {
    render(
      <ToggleGroup aria-label="score">
        <ToggleGroupItem value="1">One</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByText('One').closest('button')!.className).toContain('min-h-11');
  });
});

describe('Collapsible', () => {
  it('trigger exposes aria-expanded reflecting open state', () => {
    render(
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsiblePanel>Body</CollapsiblePanel>
      </Collapsible>,
    );
    expect(screen.getByText('Toggle')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Field (label association)', () => {
  it('associates label with the control and exposes the accessible name', () => {
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldControl render={<Input />} />
        <FieldError />
      </Field>,
    );
    // label-for-input association means getByLabelText resolves the input
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
