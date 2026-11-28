import { LoaderCircle } from 'lucide-react';
import type { ComponentPropsWithRef, MouseEvent } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  /**
   * Shows a spinner beside the unchanged label while an action runs. The button stays focusable but is
   * marked busy and disabled, and ignores clicks, so it can't start the action twice or submit its form.
   */
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  type = 'button',
  className,
  isLoading = false,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ');
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // preventDefault also stops a submit button from submitting its form.
    if (isLoading) event.preventDefault();
    else onClick?.(event);
  };

  return (
    <button
      type={type}
      className={classes}
      {...rest}
      {...(isLoading && { 'aria-busy': true, 'aria-disabled': true })}
      onClick={handleClick}
    >
      {isLoading && <LoaderCircle aria-hidden="true" className="button__spinner" />}
      {children}
    </button>
  );
}
