import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { TextField } from '@/components/TextField';

const label = 'Which frontend project are you most proud of? 🚀🔥';

function ControlledTextField({
  initial,
  multiline,
  annotation,
}: {
  initial?: string;
  multiline?: boolean;
  annotation?: ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TextField
        label={label}
        value={value}
        onValueChange={setValue}
        multiline={multiline}
        required
        annotation={annotation}
      />
      <output aria-label="Kept value">{value === undefined ? 'empty' : value}</output>
    </>
  );
}

const field = () => screen.getByRole('textbox', { name: label });
const kept = () => screen.getByRole('status', { name: 'Kept value' });

describe('TextField', () => {
  it('shows a single-line field by default', () => {
    render(<ControlledTextField />);

    expect(field().tagName).toBe('INPUT');
    expect(field()).toHaveAttribute('type', 'text');
  });

  it('shows a textarea when multiline', () => {
    render(<ControlledTextField multiline />);

    expect(field().tagName).toBe('TEXTAREA');
  });

  it('keeps line breaks typed into a multiline field', async () => {
    const user = userEvent.setup();
    render(<ControlledTextField multiline />);

    await user.type(field(), 'First line{Enter}Second line');

    expect(field()).toHaveValue('First line\nSecond line');
  });

  it('keeps what the candidate types', async () => {
    const user = userEvent.setup();
    render(<ControlledTextField />);

    await user.type(field(), 'A design system');

    expect(kept()).toHaveTextContent('A design system');
  });

  it('keeps an empty field as no answer', async () => {
    const user = userEvent.setup();
    render(<ControlledTextField initial="Draft" />);

    await user.clear(field());

    expect(kept()).toHaveTextContent('empty');
  });

  it('marks the field required and reads the annotation as its description', () => {
    render(<ControlledTextField annotation="From your profile" />);

    expect(field()).toBeRequired();
    expect(field()).toHaveAccessibleDescription('From your profile');
  });

  it('marks the field invalid and reads its error after the annotation', () => {
    render(<TextField label={label} value="x" onValueChange={() => {}} annotation="Tag" error="Too long." />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Tag Too long.');
  });

  it.each([false, true])('says when focus leaves it, multiline: %s', async (multiline) => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <TextField
        label={label}
        value={undefined}
        onValueChange={() => {}}
        multiline={multiline}
        onBlur={onBlur}
      />,
    );

    await user.click(screen.getByRole('textbox'));
    expect(onBlur).not.toHaveBeenCalled();
    await user.tab();

    expect(onBlur).toHaveBeenCalledOnce();
  });
});
