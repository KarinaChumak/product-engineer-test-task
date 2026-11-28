import { render, screen } from '@testing-library/react';
import { Button } from '@/components/Button';
import { ButtonGroup } from '@/components/ButtonGroup';

describe('ButtonGroup', () => {
  it('shows its buttons in reading order', () => {
    render(
      <ButtonGroup>
        <Button variant="secondary">Back</Button>
        <Button>Next</Button>
      </ButtonGroup>,
    );

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Back', 'Next']);
  });
});
