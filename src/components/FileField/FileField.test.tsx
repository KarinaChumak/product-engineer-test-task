import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileField, type FileFieldProps } from '@/components/FileField';

const label = 'Cover letter';

function renderFileField(props: Partial<FileFieldProps> = {}) {
  const onFilePick = vi.fn();
  const onFileRemove = vi.fn();
  render(
    <FileField
      label={label}
      chooseLabel="Choose a file"
      replaceLabel="Choose another file"
      fileName={undefined}
      onFilePick={onFilePick}
      removeLabel="Remove file"
      onFileRemove={onFileRemove}
      {...props}
    />,
  );
  return { onFilePick, onFileRemove };
}

// The input is hidden from the tree, so a test reaches it through the document.
const getPicker = () => document.querySelector<HTMLInputElement>('[data-file-picker]')!;

describe('FileField', () => {
  it('shows a button named by the label that opens the file picker', async () => {
    const user = userEvent.setup();
    renderFileField();
    const pickerClicked = vi.fn();
    getPicker().addEventListener('click', pickerClicked);

    await user.click(screen.getByRole('button', { name: new RegExp(label) }));

    expect(pickerClicked).toHaveBeenCalledOnce();
  });

  it('opens the file picker from the keyboard', async () => {
    const user = userEvent.setup();
    renderFileField();
    const pickerClicked = vi.fn();
    getPicker().addEventListener('click', pickerClicked);

    await user.tab();
    expect(screen.getByRole('button', { name: new RegExp(label) })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(pickerClicked).toHaveBeenCalledOnce();
  });

  it('hands over the file the user picks', async () => {
    const user = userEvent.setup();
    const { onFilePick } = renderFileField();
    const file = new File(['hello'], 'letter.pdf', { type: 'application/pdf' });

    await user.upload(getPicker(), file);

    expect(onFilePick).toHaveBeenCalledWith(file);
  });

  it('shows the picked file’s name and size, and offers to choose another', () => {
    renderFileField({ fileName: 'letter.pdf', fileSizeLabel: '1.2 MB' });

    expect(screen.getByRole('status')).toHaveTextContent('letter.pdf1.2 MB');
    expect(screen.getByText('letter.pdf')).toBeVisible();
    expect(screen.getByText('1.2 MB')).toBeVisible();
    expect(screen.getByRole('button', { name: /Cover letter/ })).toHaveTextContent('Choose another file');
  });

  it('offers no remove button while no file is picked', () => {
    renderFileField();

    expect(screen.queryByRole('button', { name: 'Remove file' })).not.toBeInTheDocument();
  });

  it('removes the picked file with a click and moves focus to the choose button', async () => {
    const user = userEvent.setup();
    const { onFileRemove } = renderFileField({ fileName: 'letter.pdf' });

    await user.click(screen.getByRole('button', { name: 'Remove file' }));

    expect(onFileRemove).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /Cover letter/ })).toHaveFocus();
  });

  it.each([['{Enter}'], [' ']])('removes the picked file from the keyboard with %j', async (key) => {
    const user = userEvent.setup();
    const { onFileRemove } = renderFileField({ fileName: 'letter.pdf' });

    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Remove file' })).toHaveFocus();
    await user.keyboard(key);

    expect(onFileRemove).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /Cover letter/ })).toHaveFocus();
  });

  it('marks a required field and reads its error as the button’s description', () => {
    renderFileField({ required: true, error: 'Attach a file.' });

    const button = screen.getByRole('button', { name: /Cover letter/ });
    expect(button).toHaveAttribute('aria-required', 'true');
    expect(button).toHaveAttribute('aria-invalid', 'true');
    expect(button).toHaveAccessibleDescription('Attach a file.');
  });
});
