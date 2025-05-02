/**
 * Validates if a string is either a valid standard ENS domain name format 
 * or a syntactically correct JavaScript regular expression pattern (either literal /.../ or plain).
 */
export function validateEnsDomainOrPattern(value: string | null | undefined): { isValid: boolean; error: string | null; } {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    // Allow empty/null/undefined as valid in this context 
    // (requirement is handled elsewhere, this just checks format/syntax if provided)
    return { isValid: true, error: null }; 
  }

  // Check if it looks like a /pattern/flags literal
  if (trimmedValue.startsWith('/')) {
    const lastSlashIndex = trimmedValue.lastIndexOf('/');
    if (lastSlashIndex > 0) { // Ensure closing slash exists and is not the first char
      const pattern = trimmedValue.substring(1, lastSlashIndex);
      const flags = trimmedValue.substring(lastSlashIndex + 1);
      try {
        new RegExp(pattern, flags);
        return { isValid: true, error: null }; // Valid regex literal syntax
      } catch (e: any) { 
        return { isValid: false, error: `Invalid regex pattern syntax: ${e.message}` };
      }
    } else {
      // Starts with / but no valid closing / -> Invalid format
      return { isValid: false, error: 'Invalid regex literal format: missing closing /' };
    }
  } else {
    // Doesn't start with /, treat the whole string as a pattern or domain.
    // Attempting to compile with new RegExp() also catches most invalid domain characters.
    try {
      new RegExp(trimmedValue); // This will throw on many invalid chars/syntax
      return { isValid: true, error: null }; // Valid pattern or domain-like string
    } catch (e: any) {
      // Likely contains invalid characters for a pattern/domain OR invalid regex syntax
      return { isValid: false, error: `Invalid characters or pattern syntax: ${e.message}` };
    }
  }
}