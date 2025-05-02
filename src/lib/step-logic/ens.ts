// Placeholder for ENS validation logic

export const isValidEnsDomain = (domain: string | null | undefined): boolean => {
  if (!domain) return true; // Allow empty if requirement is not 'specific_domain'
  // Basic check for now - must contain '.' and be non-empty
  // TODO: Implement more robust ENS domain validation (e.g., regex, length)
  return domain.includes('.') && domain.length > 2;
};

export const isValidAgeDays = (days: number | null | undefined): boolean => {
  if (days === null || days === undefined) return true; // Allow empty
  // Must be a non-negative integer
  return Number.isInteger(days) && days >= 0;
}; 