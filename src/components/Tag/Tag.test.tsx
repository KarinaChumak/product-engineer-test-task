import { render, screen } from '@testing-library/react';
import { Tag } from '@/components/Tag';

describe('Tag', () => {
  it('shows its text and keeps a decorative icon out of the accessible name', () => {
    render(
      <p>
        <Tag icon={<svg aria-hidden="true" role="img" aria-label="person" />}>From your profile</Tag>
      </p>,
    );

    expect(screen.getByRole('paragraph')).toHaveTextContent('From your profile');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the same text and hides its icon in the success tone', () => {
    render(
      <p>
        <Tag tone="success" icon={<svg aria-hidden="true" role="img" aria-label="check" />}>
          From your profile
        </Tag>
      </p>,
    );

    expect(screen.getByRole('paragraph')).toHaveTextContent('From your profile');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
