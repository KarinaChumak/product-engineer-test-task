import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { RadioGroup, type RadioGroupProps } from '@/components/RadioGroup';

const options = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

function ControlledRadioGroup(props: Partial<RadioGroupProps>) {
  const [value, setValue] = useState<string>();
  return (
    <RadioGroup
      label="Are you allowed to work in the EU?"
      options={options}
      value={value}
      onValueChange={setValue}
      {...props}
    />
  );
}

const group = { name: 'Are you allowed to work in the EU?' };

describe('RadioGroup', () => {
  it('shows each option as a radio under the label, with none picked at first', () => {
    render(<ControlledRadioGroup />);

    expect(screen.getByRole('radiogroup', group)).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    for (const name of ['Yes', 'No']) expect(screen.getByRole('radio', { name })).not.toBeChecked();
  });

  it('is reached by Tab and moves between options with the arrow keys, picking each', async () => {
    const user = userEvent.setup();
    render(<ControlledRadioGroup />);

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Yes' })).toHaveFocus();
    // Held, as in a real keypress: Radix moves focus a tick later and picks only while the key is down.
    await user.keyboard('{ArrowDown>}');

    expect(screen.getByRole('radio', { name: 'No' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
    await user.keyboard('{/ArrowDown}');
  });

  it('unpicks the picked option when it is clicked again, or Space is pressed on it, in an optional group', async () => {
    const user = userEvent.setup();
    render(<ControlledRadioGroup />);
    const yes = screen.getByRole('radio', { name: 'Yes' });

    await user.click(yes);
    await user.click(yes);
    expect(yes).not.toBeChecked();

    await user.click(yes);
    await user.keyboard(' ');
    expect(yes).not.toBeChecked();
  });

  it('keeps the pick when the picked option is clicked again in a required group', async () => {
    const user = userEvent.setup();
    render(<ControlledRadioGroup required />);
    const yes = screen.getByRole('radio', { name: 'Yes' });

    await user.click(yes);
    await user.click(yes);
    expect(yes).toBeChecked();
  });

  it('marks the group required and invalid, described by its annotation and error', () => {
    render(<ControlledRadioGroup required annotation="From your profile" error="Answer this question." />);

    const radiogroup = screen.getByRole('radiogroup', group);
    expect(radiogroup).toBeRequired();
    expect(radiogroup).toHaveAttribute('aria-invalid', 'true');
    expect(radiogroup).toHaveAccessibleDescription('From your profile Answer this question.');
  });

  it('calls onBlur only when focus leaves the group, not when it moves between options', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <>
        <ControlledRadioGroup onBlur={onBlur} />
        <button type="button">Next</button>
      </>,
    );

    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(onBlur).not.toHaveBeenCalled();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
