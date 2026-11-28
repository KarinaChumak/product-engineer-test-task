import { Check } from 'lucide-react';
import { useRef, type ChangeEvent, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import styles from './FileField.module.css';

export interface FileFieldProps {
  label: string;
  /** The button's text while no file is picked. */
  chooseLabel: string;
  /** The button's text once a file is picked, which picking another then replaces. */
  replaceLabel: string;
  /** The picked file's name, or undefined while none is picked. */
  fileName: string | undefined;
  /** The picked file's size as the reader should see it, such as "1.2 MB". Shown with the name. */
  fileSizeLabel?: string;
  /** Called with the file the user picks. */
  onFilePick: (file: File) => void;
  required?: boolean;
  /** Shown next to the label and read as the field's description, such as a tag. */
  annotation?: ReactNode;
  /** What's wrong with the file. Shown under the field, which is then marked invalid. */
  error?: ReactNode;
  /** Called when focus leaves the button. */
  onBlur?: () => void;
}

/**
 * A field for one file: a button that opens the browser's file picker, and the name and size of the file
 * picked. The label names the button, so a click on the label opens the picker too.
 */
export function FileField({
  label,
  chooseLabel,
  replaceLabel,
  fileName,
  fileSizeLabel,
  onFilePick,
  required,
  annotation,
  error,
  onBlur,
}: FileFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);

  function pickFileFromInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    // Emptied so that picking the same file again still counts as a change.
    event.currentTarget.value = '';
    if (file) onFilePick(file);
  }

  return (
    <Field label={label} required={required} annotation={annotation} error={error}>
      {({ required: isRequired, ...controlProps }) => (
        <div className={styles.control}>
          {/* The button stands for the picker, so the input itself is out of the tab order and the tree. */}
          <input
            ref={pickerRef}
            data-file-picker=""
            className={styles.picker}
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            onChange={pickFileFromInput}
          />
          <Button
            {...controlProps}
            variant="secondary"
            aria-required={isRequired || undefined}
            onClick={() => pickerRef.current?.click()}
            onBlur={onBlur}
          >
            {fileName === undefined ? chooseLabel : replaceLabel}
          </Button>
          {fileName !== undefined && (
            <p className={styles.file}>
              <Check aria-hidden="true" className={styles.check} />
              <span className={styles.details}>
                <span className={styles.name}>{fileName}</span>
                {fileSizeLabel && <span className={styles.size}>{fileSizeLabel}</span>}
              </span>
            </p>
          )}
        </div>
      )}
    </Field>
  );
}
