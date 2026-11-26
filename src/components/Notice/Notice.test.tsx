import { render, screen } from '@testing-library/react';
import { Notice } from '@/components/Notice';

describe('Notice', () => {
  it('shows the title as a heading and the description', () => {
    render(<Notice title="Job not found" description="Check the link you followed." />);

    expect(screen.getByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
    expect(screen.getByText('Check the link you followed.')).toBeInTheDocument();
  });

  it('announces itself as an alert, with its action inside', () => {
    render(
      <Notice
        title="We couldn’t load this job"
        description="Please try again."
        role="alert"
        action={<button type="button">Try again</button>}
      />,
    );

    expect(screen.getByRole('alert')).toContainElement(screen.getByRole('button', { name: 'Try again' }));
  });
});
