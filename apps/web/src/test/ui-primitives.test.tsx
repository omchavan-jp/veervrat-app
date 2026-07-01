import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Spinner } from '../../components/ui/spinner';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { StatusBanner } from '../../components/auth/status-banner';
import { QueryBoundary } from '../../components/ui/query-boundary';

describe('Spinner', () => {
  it('exposes role=status with an sr-only label', () => {
    render(<Spinner label="Loading journeys" />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.getByText('Loading journeys')).toBeInTheDocument();
  });

  it('defaults the accessible label to "Loading"', () => {
    render(<Spinner />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('the animated arc is aria-hidden and carries animate-spin', () => {
    const { container } = render(<Spinner />);
    const arc = container.querySelector('.animate-spin');
    expect(arc).toBeTruthy();
    expect(arc).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Textarea', () => {
  it('renders a textarea wired for aria-invalid styling', () => {
    render(<Textarea aria-label="notes" aria-invalid />);
    const ta = screen.getByLabelText('notes');
    expect(ta.tagName).toBe('TEXTAREA');
    expect(ta).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Input variants', () => {
  it('applies the underline variant border classes', () => {
    render(<Input variant="underline" aria-label="email" />);
    const el = screen.getByLabelText('email');
    expect(el.className).toContain('border-b');
    expect(el.className).toContain('rounded-none');
  });

  it('defaults to the bordered variant', () => {
    render(<Input aria-label="name" />);
    expect(screen.getByLabelText('name').className).toContain('border-input');
  });
});

describe('StatusBanner (rebuilt on Alert)', () => {
  it('error variant has role=alert and uses the danger token, not brand accent', () => {
    render(<StatusBanner variant="error" title="Failed" description="Try again" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    // must not reuse hardcoded brand-accent rgba background
    expect(alert.className).not.toContain('rgba(192,81,47');
  });

  it('success variant uses the success token', () => {
    render(<StatusBanner variant="success" title="Done" description="All set" />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('success');
  });
});

describe('QueryBoundary', () => {
  it('shows a spinner while loading and hides children', () => {
    render(
      <QueryBoundary isLoading isError={false} errorTitle="err">
        <div>content</div>
      </QueryBoundary>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows a distinct error state (not the empty state) on error', () => {
    render(
      <QueryBoundary
        isLoading={false}
        isError
        errorTitle="Could not load"
        empty={<div>nothing here</div>}
        isEmpty
      >
        <div>content</div>
      </QueryBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not load')).toBeInTheDocument();
    // error must NOT fall through to the empty state
    expect(screen.queryByText('nothing here')).not.toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('renders the empty slot when empty and not loading/error', () => {
    render(
      <QueryBoundary
        isLoading={false}
        isError={false}
        isEmpty
        errorTitle="err"
        empty={<div>nothing here</div>}
      >
        <div>content</div>
      </QueryBoundary>,
    );
    expect(screen.getByText('nothing here')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('renders children on success', () => {
    render(
      <QueryBoundary isLoading={false} isError={false} errorTitle="err">
        <div>content</div>
      </QueryBoundary>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
