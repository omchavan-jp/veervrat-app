import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// @base-ui/react/button renders a <button> element — no mock needed
import { Button } from '../../components/ui/button';

describe('Button loading state', () => {
  it('shows spinner and no children text when loading=true', () => {
    render(<Button loading>Save</Button>);
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument(); // sr-only span
  });

  it('is disabled when loading=true', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows children when loading=false', () => {
    render(<Button loading={false}>Save</Button>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('is not disabled when loading=false and disabled not set', () => {
    render(<Button loading={false}>Save</Button>);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('spinner has animate-spin class when loading', () => {
    const { container } = render(<Button loading>Save</Button>);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('is disabled when loading=true even if disabled={false} is explicitly passed', () => {
    render(
      <Button loading={true} disabled={false}>
        Save
      </Button>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
