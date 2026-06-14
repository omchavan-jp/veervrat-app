import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSetTheme = vi.hoisted(() => vi.fn());
const mockResolvedTheme = vi.hoisted(() => ({ value: 'light' }));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme.value, setTheme: mockSetTheme }),
}));

import { ThemeToggle } from '../../components/shared/theme-toggle';

// The toggle is a single icon button that flips light↔dark (system resolves to its
// effective theme first). It shows the icon for the mode you'd switch TO.
describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvedTheme.value = 'light';
  });

  it('renders a single toggle button', () => {
    render(<ThemeToggle />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('in light mode, offers to switch to dark', () => {
    mockResolvedTheme.value = 'light';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it('in dark mode, offers to switch to light', () => {
    mockResolvedTheme.value = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('clicking in light mode sets dark', () => {
    mockResolvedTheme.value = 'light';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('clicking in dark mode sets light', () => {
    mockResolvedTheme.value = 'dark';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
