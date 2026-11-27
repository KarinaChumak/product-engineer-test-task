import { render, screen } from '@testing-library/react';
import { FieldError } from '@/components/FieldError';

describe('FieldError', () => {
  it('describes the field that refers to it, without the decorative icon', () => {
    render(
      <>
        <input aria-label="Salary" aria-describedby="salary-error" />
        <FieldError id="salary-error">Enter a whole number.</FieldError>
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Salary' })).toHaveAccessibleDescription(
      'Enter a whole number.',
    );
  });
});
