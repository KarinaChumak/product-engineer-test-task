import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { useId, type ReactNode } from 'react';
import { FieldError, joinDescriptionIds } from '@/components/FieldError';
import styles from './RadioGroup.module.css';

export interface RadioOption {
  label: string;
  value: string;
}

export interface RadioGroupProps {
  label: string;
  options: RadioOption[];
  /** The picked option's value, or undefined while none is picked. */
  value: string | undefined;
  onValueChange: (value: string) => void;
  required?: boolean;
  /** Shown next to the label and read as the group's description, such as a tag. */
  annotation?: ReactNode;
  /** What's wrong with the value. Shown under the options, and the group is then marked invalid. */
  error?: ReactNode;
  /** Called when focus leaves the group. Moving between its options doesn't count. */
  onBlur?: () => void;
}

/** A labelled set of options of which one can be picked, side by side. Arrow keys move and pick. */
export function RadioGroup({
  label,
  options,
  value,
  onValueChange,
  required = false,
  annotation,
  error,
  onBlur,
}: RadioGroupProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const annotationId = `${id}-annotation`;
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <span id={labelId} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' *'}
            </span>
          )}
        </span>
        {annotation && <span id={annotationId}>{annotation}</span>}
      </div>
      <RadixRadioGroup.Root
        className={styles.options}
        value={value ?? null}
        onValueChange={onValueChange}
        required={required}
        aria-labelledby={labelId}
        aria-describedby={joinDescriptionIds(!!annotation && annotationId, !!error && errorId)}
        aria-invalid={error ? true : undefined}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
        }}
      >
        {options.map((option) => {
          const itemId = `${id}-${option.value}`;
          return (
            <label key={option.value} htmlFor={itemId} className={styles.option}>
              <RadixRadioGroup.Item id={itemId} value={option.value} className={styles.radio}>
                <RadixRadioGroup.Indicator className={styles.dot} />
              </RadixRadioGroup.Item>
              {option.label}
            </label>
          );
        })}
      </RadixRadioGroup.Root>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
