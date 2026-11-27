import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/Button';
import { Form } from '@/components/Form';

describe('Form', () => {
  it('calls onSubmit when its submit button is pressed, as a named form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <Form label="Application" onSubmit={onSubmit}>
        <Button type="submit">Send</Button>
      </Form>,
    );

    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByRole('form', { name: 'Application' })).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
