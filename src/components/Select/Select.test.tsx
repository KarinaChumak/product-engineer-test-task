import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Select } from '@/components/Select';

const options = [
  { label: 'Immediately', value: 'immediately' },
  { label: '1 month', value: '1_month' },
  { label: '3 months', value: '3_months' },
];

function ControlledSelect({ initial, required = true }: { initial?: string; required?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <Select
      label="What is your notice period?"
      options={options}
      value={value}
      onValueChange={setValue}
      placeholder="Choose an option"
      required={required}
    />
  );
}

describe('Select', () => {
  it('shows the placeholder until an option is chosen', () => {
    render(<ControlledSelect />);

    expect(screen.getByRole('combobox', { name: 'What is your notice period?' })).toHaveTextContent(
      'Choose an option',
    );
  });

  it('tells assistive technology whether an answer is required', () => {
    render(
      <>
        <ControlledSelect />
        <ControlledSelect required={false} />
      </>,
    );

    const [required, optional] = screen.getAllByRole('combobox');
    expect(required).toBeRequired();
    expect(optional).not.toBeRequired();
  });

  it('lists the options as written', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Immediately',
      '1 month',
      '3 months',
    ]);
  });

  it('picks another option by mouse', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect initial="3_months" />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '1 month' }));

    expect(screen.getByRole('combobox')).toHaveTextContent('1 month');
  });

  it('picks another option by keyboard', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect initial="3_months" />);

    await user.tab();
    expect(screen.getByRole('combobox')).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowUp}{Enter}');

    expect(screen.getByRole('combobox')).toHaveTextContent('1 month');
  });
});
