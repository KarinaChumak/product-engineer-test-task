import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('calls onClick when the user clicks it', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save changes</Button>);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Save changes
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  describe('while loading', () => {
    it('keeps its label as its name, marked busy and disabled, with a decorative spinner', () => {
      render(<Button isLoading>Save changes</Button>);

      const button = screen.getByRole('button', { name: 'Save changes' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });

    it('stays focusable, so focus is not lost while it works', async () => {
      const user = userEvent.setup();
      render(<Button isLoading>Save changes</Button>);

      await user.tab();

      expect(screen.getByRole('button', { name: 'Save changes' })).toHaveFocus();
    });

    it('ignores clicks', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button isLoading onClick={onClick}>
          Save changes
        </Button>,
      );

      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not submit its form when clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
      render(
        <form aria-label="Settings" onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
          <Button type="submit" isLoading>
            Save changes
          </Button>
        </form>,
      );

      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows no spinner and is not busy when not loading', () => {
      render(<Button>Save changes</Button>);

      const button = screen.getByRole('button', { name: 'Save changes' });
      expect(button).not.toHaveAttribute('aria-busy');
      expect(button.querySelector('svg')).not.toBeInTheDocument();
    });
  });
});
