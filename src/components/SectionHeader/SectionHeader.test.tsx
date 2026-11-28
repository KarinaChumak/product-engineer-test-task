import { render, screen } from '@testing-library/react';
import { SectionHeader } from '@/components/SectionHeader';

describe('SectionHeader', () => {
  it('shows the title as a second-level heading, with the eyebrow above it', () => {
    render(<SectionHeader eyebrow="Step 2 of 3" title="Quick answers" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Quick answers' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });
});
