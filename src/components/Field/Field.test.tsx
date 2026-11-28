import { render, screen } from '@testing-library/react';
import { Field } from '@/components/Field';

const label = 'Your city';

describe('Field', () => {
  it('names its control by the label', () => {
    render(<Field label={label}>{(props) => <input {...props} />}</Field>);

    expect(screen.getByRole('textbox', { name: label })).toBeValid();
  });

  it('marks a required control required, keeping the star out of its name', () => {
    render(
      <Field label={label} required>
        {(props) => <input {...props} />}
      </Field>,
    );

    expect(screen.getByRole('textbox', { name: label })).toBeRequired();
    expect(screen.getByText(label)).toHaveTextContent(`${label} *`);
  });

  it('reads the annotation as the control’s description', () => {
    render(
      <Field label={label} annotation="From your profile">
        {(props) => <input {...props} />}
      </Field>,
    );

    expect(screen.getByRole('textbox', { name: label })).toHaveAccessibleDescription('From your profile');
  });

  it('shows the error under the control, marks it invalid and reads the error after the annotation', () => {
    render(
      <Field label={label} annotation="From your profile" error="Answer this question to continue.">
        {(props) => <input {...props} />}
      </Field>,
    );

    const control = screen.getByRole('textbox', { name: label });
    expect(control).toBeInvalid();
    expect(control).toHaveAccessibleDescription('From your profile Answer this question to continue.');
  });
});
