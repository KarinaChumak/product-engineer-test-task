import { render, screen } from '@testing-library/react';
import { TopBar } from '@/components/TopBar';

describe('TopBar', () => {
  it('shows its content inside a navigation landmark named by its label', () => {
    render(
      <TopBar label="Jobs">
        <a href="/jobs/job-long">Senior Frontend Engineer</a>
      </TopBar>,
    );

    const nav = screen.getByRole('navigation', { name: 'Jobs' });
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Senior Frontend Engineer' }));
  });
});
