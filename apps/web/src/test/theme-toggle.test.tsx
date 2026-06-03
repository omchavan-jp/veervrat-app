import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSetTheme = vi.hoisted(() => vi.fn());
const mockTheme = vi.hoisted(() => ({ value: 'system' }));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme.value, setTheme: mockSetTheme }),
}));

import { ThemeToggle } from '../../components/shared/theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme.value = 'system';
  });

  it('renders Light, Dark, and System buttons', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument();
  });

  it('System button has aria-pressed true when theme is system', () => {
    mockTheme.value = 'system';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Dark button has aria-pressed true when theme is dark', () => {
    mockTheme.value = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Dark calls setTheme("dark")', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('clicking Light calls setTheme("light")', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('clicking System calls setTheme("system")', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });
});
