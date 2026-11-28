import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { FieldError, joinDescriptionIds } from '@/components/FieldError';
import styles from './CheckboxGroup.module.css';

export interface CheckboxOption {
  label: string;
  value: string;
}

export interface CheckboxGroupProps {
  /** The group's legend. */
  label: string;
  options: CheckboxOption[];
  /** The checked values, in the order of `options`. */
  value: string[];
  onValueChange: (value: string[]) => void;
  /** At most this many can be checked: once they are, the unchecked options are disabled. Unset: no limit. */
  maxChecked?: number;
  /** A short line under the legend, read as the group's description, such as how many can be checked. */
  hint?: ReactNode;
  required?: boolean;
  /** Shown next to the legend and read as the group's description, such as a tag. */
  annotation?: ReactNode;
  /** What's wrong with the value. Shown under the group, whose checkboxes are then marked invalid. */
  error?: ReactNode;
  /** Called when focus leaves the group. Moving between its checkboxes doesn't count. */
  onBlur?: () => void;
}

/** A set of checkboxes under one legend, for picking several options. */
export function CheckboxGroup({
  label,
  options,
  value,
  onValueChange,
  maxChecked,
  hint,
  required = false,
  annotation,
  error,
  onBlur,
}: CheckboxGroupProps) {
  const id = useId();
  const annotationId = `${id}-annotation`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const isFull = maxChecked !== undefined && value.length >= maxChecked;

  function setOptionChecked(optionValue: string, isChecked: boolean) {
    const checked = new Set(value);
    if (isChecked) checked.add(optionValue);
    else checked.delete(optionValue);
    onValueChange(options.filter((option) => checked.has(option.value)).map((option) => option.value));
  }

  return (
    <fieldset
      className={styles.group}
      aria-describedby={joinDescriptionIds(
        !!annotation && annotationId,
        !!hint && hintId,
        !!error && errorId,
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
      }}
    >
      <legend className={styles.legend}>
        <span className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' *'}
            </span>
          )}
        </span>
        {annotation && <span id={annotationId}>{annotation}</span>}
      </legend>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <div>
        {options.map((option) => {
          const checkboxId = `${id}-${option.value}`;
          const isChecked = value.includes(option.value);
          return (
            <label key={option.value} htmlFor={checkboxId} className={styles.option}>
              <Checkbox.Root
                id={checkboxId}
                className={styles.checkbox}
                checked={isChecked}
                onCheckedChange={(next) => setOptionChecked(option.value, next === true)}
                disabled={isFull && !isChecked}
                aria-invalid={error ? true : undefined}
              >
                <Checkbox.Indicator>
                  <Check aria-hidden="true" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              {option.label}
            </label>
          );
        })}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}
