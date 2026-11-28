import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('shows its message and keeps a decorative icon out of the accessibility tree', () => {
    render(
      <EmptyState icon={<svg aria-hidden="true" role="img" aria-label="clipboard" />}>
        This job has no questions for you to answer.
      </EmptyState>,
    );

    expect(screen.getByText('This job has no questions for you to answer.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows its title as a second-level heading above the message', () => {
    render(<EmptyState title="Nothing to answer">Pick another job.</EmptyState>);

    expect(screen.getByRole('heading', { level: 2, name: 'Nothing to answer' })).toBeInTheDocument();
    expect(screen.getByText('Pick another job.')).toBeInTheDocument();
  });
});
