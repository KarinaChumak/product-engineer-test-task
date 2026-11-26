import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { Select } from '@/components/Select';

const options = [
  { label: 'Immediately', value: 'immediately' },
  { label: '1 month', value: '1_month' },
  { label: '3 months', value: '3_months' },
];

describe('Select with a hidden label', () => {
  it('still names the select by its label', () => {
    render(
      <Select
        label="Switch job"
        labelHidden
        options={options}
        value="1_month"
        onValueChange={() => {}}
        placeholder="Choose a job"
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Switch job' })).toHaveTextContent('1 month');
  });
});

function ControlledSelect({
  initial,
  required = true,
  annotation,
}: {
  initial?: string;
  required?: boolean;
  annotation?: ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Select
      label="What is your notice period?"
      options={options}
      value={value}
      onValueChange={setValue}
      placeholder="Choose an option"
      required={required}
      annotation={annotation}
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

  it('shows the annotation and describes the field with it', () => {
    render(<ControlledSelect initial="3_months" annotation="From your profile" />);

    const combobox = screen.getByRole('combobox', { name: 'What is your notice period?' });
    expect(combobox).toHaveTextContent('3 months');
    expect(combobox).toHaveAccessibleDescription('From your profile');
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
