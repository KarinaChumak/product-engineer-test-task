import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { CheckboxGroup, type CheckboxGroupProps } from '@/components/CheckboxGroup';

const options = [
  { label: 'Frontend architecture', value: 'frontend' },
  { label: 'Design systems', value: 'design_systems' },
  { label: 'Performance', value: 'performance' },
];

function ControlledCheckboxGroup(props: Partial<CheckboxGroupProps>) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <CheckboxGroup
      label="Which areas would you like to focus on?"
      options={options}
      value={value}
      onValueChange={setValue}
      {...props}
    />
  );
}

describe('CheckboxGroup', () => {
  it('groups its checkboxes under the label as their legend, with the hint as the group’s description', () => {
    render(<ControlledCheckboxGroup hint="Pick up to 2" />);

    const group = screen.getByRole('group', { name: 'Which areas would you like to focus on?' });
    expect(group).toHaveAccessibleDescription('Pick up to 2');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('checkbox', { name: 'Design systems' })).not.toBeChecked();
  });

  it('tells assistive technology a required group is required, in the legend', () => {
    render(<ControlledCheckboxGroup required requiredLabel="required" />);

    expect(
      screen.getByRole('group', { name: 'Which areas would you like to focus on? required' }),
    ).toBeInTheDocument();
  });

  it('checks and unchecks options by mouse, in the order of the options', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <CheckboxGroup label="Areas" options={options} value={['performance']} onValueChange={onValueChange} />,
    );

    await user.click(screen.getByText('Frontend architecture'));
    expect(onValueChange).toHaveBeenLastCalledWith(['frontend', 'performance']);

    await user.click(screen.getByRole('checkbox', { name: 'Performance' }));
    expect(onValueChange).toHaveBeenLastCalledWith([]);
  });

  it('moves between options with Tab and toggles them with Space', async () => {
    const user = userEvent.setup();
    render(<ControlledCheckboxGroup />);

    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'Frontend architecture' })).toHaveFocus();
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox', { name: 'Design systems' })).toBeChecked();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox', { name: 'Design systems' })).not.toBeChecked();
  });

  it('says when focus leaves the group, but not when it moves between its options', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <>
        <ControlledCheckboxGroup onBlur={onBlur} />
        <button type="button">Next</button>
      </>,
    );

    await user.tab();
    await user.tab();
    await user.tab();
    expect(onBlur).not.toHaveBeenCalled();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it('shows the annotation and the error as the group’s description, and marks its checkboxes invalid', () => {
    render(<ControlledCheckboxGroup annotation="From your profile" error="Answer this question." />);

    expect(screen.getByRole('group')).toHaveAccessibleDescription('From your profile Answer this question.');
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    }
  });
});
