import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers/render';
import {
  FloatingLauncher,
  type LauncherAction,
} from '@/components/shared/launcher/floating-launcher';

/**
 * The launcher replaced the feedback widget's own button, and nothing tested that widget.
 *
 * Swapping the mount of a working feature with no coverage is how a regression ships unnoticed —
 * so the behaviour that changed is pinned here: what happens with none, one, and several actions.
 */
describe('FloatingLauncher — one affordance for however many actions exist', () => {
  const action = (key: string, onSelect = vi.fn()): LauncherAction => ({
    key,
    label: key,
    icon: <span aria-hidden="true" />,
    onSelect,
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders nothing at all when there are no actions', () => {
    const { container } = renderWithProviders(<FloatingLauncher actions={[]} icon={<span />} />);

    expect(container.querySelector('button')).toBeNull();
  });

  // Someone who holds one capability should not pay for the existence of others: clicking must
  // do the thing, not open a menu of one.
  it('with a single action, the button performs it directly and opens no menu', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <FloatingLauncher actions={[action('feedback', onSelect)]} icon={<span />} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'feedback' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('with several actions, the button opens a menu listing each of them', async () => {
    const feedback = vi.fn();
    const suggest = vi.fn();
    renderWithProviders(
      <FloatingLauncher
        actions={[action('feedback', feedback), action('suggest', suggest)]}
        icon={<span />}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'feedback' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'suggest' })).toBeInTheDocument();
    expect(feedback, 'opening the menu must not perform anything').not.toHaveBeenCalled();
  });

  it('choosing a menu item performs that action and closes the menu', async () => {
    const suggest = vi.fn();
    renderWithProviders(
      <FloatingLauncher
        actions={[action('feedback'), action('suggest', suggest)]}
        icon={<span />}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'suggest' }));

    expect(suggest).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('Escape closes the menu without performing anything', async () => {
    const feedback = vi.fn();
    renderWithProviders(
      <FloatingLauncher
        actions={[action('feedback', feedback), action('suggest')]}
        icon={<span />}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(feedback).not.toHaveBeenCalled();
  });

  // localStorage throws outright in some contexts rather than returning null. The launcher must
  // still appear — forgetting which corner it was in is not a reason to refuse to render.
  it('renders even when localStorage is unavailable', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    renderWithProviders(<FloatingLauncher actions={[action('feedback')]} icon={<span />} />);

    expect(screen.getByRole('button', { name: 'feedback' })).toBeInTheDocument();
    spy.mockRestore();
  });
});
