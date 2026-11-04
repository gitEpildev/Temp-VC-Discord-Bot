export function validateRename(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Name cannot be empty." };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "Name must be 1-100 characters." };
  }
  return { valid: true };
}

export function validateLimit(value: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    return { valid: false, error: "Limit must be 0-99." };
  }
  return { valid: true };
}
