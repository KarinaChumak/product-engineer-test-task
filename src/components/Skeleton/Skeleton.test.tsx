import { render, screen } from '@testing-library/react';
import { Skeleton } from '@/components/Skeleton';

describe('Skeleton', () => {
  it('announces the loading label as a status', () => {
    render(<Skeleton label="Loading the job…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading the job…');
  });
});
