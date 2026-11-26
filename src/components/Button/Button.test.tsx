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
});
