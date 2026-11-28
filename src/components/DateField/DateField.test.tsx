import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DateField } from '@/components/DateField';

const label = 'When could you start?';

function ControlledDateField({ initial }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DateField label={label} value={value} onValueChange={setValue} required />
      <output aria-label="Kept value">{value ?? 'empty'}</output>
    </>
  );
}

// A date input has no ARIA role, so it's found by its label, whose text also holds the hidden required " *".
const field = () => screen.getByLabelText<HTMLInputElement>(label, { exact: false });
const kept = () => screen.getByRole('status', { name: 'Kept value' });

describe('DateField', () => {
  it('shows a required date input named by its label', () => {
    render(<ControlledDateField />);

    expect(field()).toHaveAttribute('type', 'date');
    expect(field()).toBeRequired();
  });

  it('keeps the picked date as YYYY-MM-DD', async () => {
    const user = userEvent.setup();
    render(<ControlledDateField />);

    await user.type(field(), '2027-01-15');

    expect(kept()).toHaveTextContent('2027-01-15');
  });

  it('keeps no value once the date is cleared', async () => {
    const user = userEvent.setup();
    render(<ControlledDateField initial="2027-01-15" />);

    await user.clear(field());

    expect(kept()).toHaveTextContent('empty');
  });

  it('limits the picker to the dates from min to max', () => {
    render(
      <DateField
        label={label}
        value={undefined}
        onValueChange={() => {}}
        min="2026-06-15"
        max="2026-12-31"
      />,
    );

    expect(field()).toHaveAttribute('min', '2026-06-15');
    expect(field()).toHaveAttribute('max', '2026-12-31');
  });

  it('calls onBlur when focus leaves the field', async () => {
    const user = userEvent.setup();
    const left: string[] = [];
    render(
      <DateField label={label} value={undefined} onValueChange={() => {}} onBlur={() => left.push('left')} />,
    );

    await user.click(field());
    await user.tab();

    expect(left).toEqual(['left']);
  });
});
