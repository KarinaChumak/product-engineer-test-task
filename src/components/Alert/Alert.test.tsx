import { render, screen } from '@testing-library/react';
import { Alert } from '@/components/Alert';

describe('Alert', () => {
  it('announces its message, without the decorative icon in it', () => {
    render(<Alert>We couldn’t send it.</Alert>);

    expect(screen.getByRole('alert')).toHaveTextContent(/^We couldn’t send it\.$/);
  });
});
