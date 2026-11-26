import { render, screen } from '@testing-library/react';
import { Stack } from '@/components/Stack';

describe('Stack', () => {
  it('renders its children in order', () => {
    render(
      <Stack>
        <p>First</p>
        <p>Second</p>
      </Stack>,
    );

    expect(screen.getAllByRole('paragraph').map((p) => p.textContent)).toEqual(['First', 'Second']);
  });
});
