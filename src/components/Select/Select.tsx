import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { FieldError, joinDescriptionIds } from '@/components/FieldError';
import styles from './Select.module.css';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  /** Shown next to the label and read as the field's description, such as a tag. */
  annotation?: ReactNode;
  /** What's wrong with the value. Shown under the field, which is then marked invalid. */
  error?: ReactNode;
  /** Keep the label for screen readers only, for a compact select whose options say what it's for. */
  labelHidden?: boolean;
  /** Called when focus leaves the select. Opening its list and picking an option doesn't count. */
  onBlur?: () => void;
}

export function Select({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  required = false,
  annotation,
  error,
  labelHidden = false,
  onBlur,
}: SelectProps) {
  const id = useId();
  // Opening the list moves focus from the trigger into it, which isn't leaving the select. A ref, not
  // state, because the trigger blurs before React renders the open list.
  const isListOpenRef = useRef(false);
  const labelId = `${id}-label`;
  const annotationId = `${id}-annotation`;
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <div className={labelHidden ? styles.visuallyHidden : styles.header}>
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
      <RadixSelect.Root
        value={value ?? ''}
        onValueChange={onValueChange}
        onOpenChange={(isOpen) => {
          isListOpenRef.current = isOpen;
        }}
        required={required}
      >
        <RadixSelect.Trigger
          className={styles.trigger}
          onBlur={() => {
            if (!isListOpenRef.current) onBlur?.();
          }}
          aria-labelledby={labelId}
          aria-describedby={joinDescriptionIds(!!annotation && annotationId, !!error && errorId)}
          aria-invalid={error ? true : undefined}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon className={styles.chevron}>
            <ChevronDown aria-hidden="true" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className={styles.content} position="popper" sideOffset={4}>
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item key={option.value} value={option.value} className={styles.item}>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className={styles.check}>
                    <Check aria-hidden="true" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
