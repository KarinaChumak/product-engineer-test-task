import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useId } from 'react';
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
}

export function Select({ label, options, value, onValueChange, placeholder, required = false }: SelectProps) {
  const labelId = `${useId()}-label`;

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
      </div>
      <RadixSelect.Root value={value ?? ''} onValueChange={onValueChange} required={required}>
        <RadixSelect.Trigger className={styles.trigger} aria-labelledby={labelId}>
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
    </div>
  );
}
