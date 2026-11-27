/** The ids for a field's `aria-describedby`, leaving out the parts it doesn't show, or undefined for none. */
export const joinDescriptionIds = (...ids: (string | false)[]): string | undefined =>
  ids.filter(Boolean).join(' ') || undefined;
