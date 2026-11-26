import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';

describe('App', () => {
  it('counts clicks', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Click me' }));

    expect(screen.getByText('Clicked 1 times.')).toBeInTheDocument();
  });
});
