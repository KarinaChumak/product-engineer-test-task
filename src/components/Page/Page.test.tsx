import { render, screen } from '@testing-library/react';
import { Page } from '@/components/Page';

describe('Page', () => {
  it('renders its content as the main landmark', () => {
    render(<Page>Content</Page>);

    expect(screen.getByRole('main')).toHaveTextContent('Content');
  });
});
