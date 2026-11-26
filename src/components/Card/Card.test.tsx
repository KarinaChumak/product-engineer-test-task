import { render, screen } from '@testing-library/react';
import { Card } from '@/components/Card';

describe('Card', () => {
  it('shows its content', () => {
    render(
      <Card>
        <h1>Frontend Developer (React)</h1>
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Frontend Developer (React)' })).toBeInTheDocument();
  });
});
