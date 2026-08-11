export const minimumPasswordLength = 8;

export function isStrongPassword(value: string) {
  return minimumPasswordLength <= value.length && /[A-Za-z]/.test(value) && /\d/.test(value) && !/\s/.test(value);
}
