export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function isValidPostalCode(code: string): boolean {
  return code.trim().length >= 3;
}

export interface FieldErrors {
  [field: string]: string;
}
