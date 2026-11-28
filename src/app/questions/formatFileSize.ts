import type { IntlShape } from 'react-intl';

const kilobytesPerMegabyte = 1000;
const bytesPerKilobyte = 1000;
const bytesPerMegabyte = bytesPerKilobyte * kilobytesPerMegabyte;

/** A file size in decimal units (1 kB = 1000 bytes), rounded to one decimal: "820 kB", "5 MB". */
export function formatFileSize(intl: IntlShape, bytes: number) {
  // Compared after rounding to one decimal, so 999,999 bytes is "1 MB", not "1,000 kB".
  const roundedKilobytes = Math.round((bytes / bytesPerKilobyte) * 10) / 10;
  const [value, unit] =
    bytes >= bytesPerMegabyte || roundedKilobytes >= kilobytesPerMegabyte
      ? [bytes / bytesPerMegabyte, 'megabyte']
      : bytes >= bytesPerKilobyte
        ? [bytes / bytesPerKilobyte, 'kilobyte']
        : [bytes, 'byte'];
  return intl.formatNumber(value, { style: 'unit', unit, maximumFractionDigits: 1 });
}
