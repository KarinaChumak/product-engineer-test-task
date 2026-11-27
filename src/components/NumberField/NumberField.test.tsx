import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { NumberField } from '@/components/NumberField';

const label = 'What is your yearly salary expectation in EUR?';

function ControlledNumberField({
  initial,
  locale = 'en',
  annotation,
}: {
  initial?: number;
  locale?: string;
  annotation?: ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <NumberField
        label={label}
        value={value}
        onValueChange={setValue}
        locale={locale}
        required
        annotation={annotation}
      />
      <output aria-label="Kept value">{value === undefined ? 'empty' : String(value)}</output>
    </>
  );
}

const field = () => screen.getByRole<HTMLInputElement>('textbox', { name: label });
const kept = () => screen.getByRole('status', { name: 'Kept value' });

describe('NumberField', () => {
  it('groups the number for English', () => {
    render(<ControlledNumberField initial={95000} />);

    expect(field()).toHaveValue('95,000');
  });

  it('groups the number for German', () => {
    render(<ControlledNumberField initial={95000} locale="de" />);

    expect(field()).toHaveValue('95.000');
  });

  it('keeps the answer as a whole number while showing it grouped', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField />);

    await user.type(field(), '120000');

    expect(field()).toHaveValue('120,000');
    expect(kept()).toHaveTextContent('120000');
  });

  it('drops anything that is not a digit', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField />);

    await user.type(field(), '9a5-.e000');

    expect(field()).toHaveValue('95,000');
  });

  it('keeps every digit of a pasted number grouped with dots', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField />);

    await user.click(field());
    await user.paste('95.000 €');

    expect(kept()).toHaveTextContent('95000');
  });

  it('keeps every digit of a pasted number grouped with commas in German', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField locale="de" />);

    await user.click(field());
    await user.paste('€95,000');

    expect(kept()).toHaveTextContent('95000');
  });

  it('keeps typing where the caret is when separators move', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField initial={95000} />);

    // Put the caret after "95" and type a digit there.
    await user.click(field());
    field().setSelectionRange(2, 2);
    await user.keyboard('1');

    expect(field()).toHaveValue('951,000');
    await user.keyboard('2');
    expect(field()).toHaveValue('9,512,000');
  });

  it('deletes the digit before a separator on Backspace', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField initial={95000} />);

    // Caret just after the comma in "95,|000".
    await user.click(field());
    field().setSelectionRange(3, 3);
    await user.keyboard('{Backspace}');

    expect(field()).toHaveValue('9,000');
  });

  it('deletes the digit after a separator on Delete', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField initial={95000} />);

    // Caret just before the comma in "95|,000".
    await user.click(field());
    field().setSelectionRange(2, 2);
    await user.keyboard('{Delete}');

    expect(field()).toHaveValue('9,500');
  });

  it('refuses a digit beyond the longest number it can keep exactly', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField initial={123456789012345} />);

    await user.click(field());
    field().setSelectionRange(0, 0);
    await user.keyboard('9');

    expect(kept()).toHaveTextContent('123456789012345');
  });

  it('is empty again when every digit is deleted', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField initial={95} />);

    await user.clear(field());

    expect(field()).toHaveValue('');
    expect(kept()).toHaveTextContent('empty');
  });

  it('is reached and filled by keyboard', async () => {
    const user = userEvent.setup();
    render(<ControlledNumberField />);

    await user.tab();
    expect(field()).toHaveFocus();
    await user.keyboard('80000');

    expect(field()).toHaveValue('80,000');
  });

  it('opens the numeric keyboard on touch devices and says an answer is required', () => {
    render(<ControlledNumberField />);

    expect(field()).toHaveAttribute('inputmode', 'numeric');
    expect(field()).toBeRequired();
  });

  it('shows the annotation and describes the field with it', () => {
    render(<ControlledNumberField initial={95000} annotation="From your profile" />);

    expect(field()).toHaveAccessibleDescription('From your profile');
  });

  it('marks the field invalid and reads its error', () => {
    render(<NumberField label={label} value={5} onValueChange={() => {}} locale="en" error="Too small." />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Too small.');
  });
});
