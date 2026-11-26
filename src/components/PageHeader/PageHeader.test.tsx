import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/components/PageHeader';

describe('PageHeader', () => {
  it('shows the title as the page heading, with the eyebrow above it', () => {
    render(<PageHeader eyebrow="Kranich Health GmbH" title="Frontend Developer" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Frontend Developer' })).toBeInTheDocument();
    expect(screen.getByText('Kranich Health GmbH')).toBeInTheDocument();
  });
});
