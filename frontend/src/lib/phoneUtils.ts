/**
 * Phone number validation and formatting utility functions for Viam.
 * Supports E.164 normalization, dynamic display formatting, and phone masking.
 */

/**
 * Normalizes any natural input phone format (e.g., "(415) 555-1234") into a standard E.164 value (e.g., "+14155551234").
 * If the input starts with a "+", it preserves the user's explicit country code.
 * Otherwise, it prepends the default country prefix (e.g. "1" for US/Canada).
 */
export function normalizePhoneNumber(input: string, defaultCountryPrefix: string = "1"): string {
  const cleaned = input.trim();
  if (cleaned.startsWith("+")) {
    // Already has country code prefix, keep digits only (with +)
    return "+" + cleaned.replace(/\D/g, "");
  }
  
  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return "";

  // U.S./Canada handling
  if (defaultCountryPrefix === "1") {
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
  }

  // Generic fallback: check if number starts with prefix already
  if (digits.startsWith(defaultCountryPrefix) && digits.length > defaultCountryPrefix.length + 4) {
    return `+${digits}`;
  }
  
  return `+${defaultCountryPrefix}${digits}`;
}

/**
 * Dynamic formatter that formats digits as the user types.
 * For US (+1), formats up to "(XXX) XXX-XXXX".
 * For other countries, returns a cleaned digit string or preserves a leading "+".
 */
export function formatPhoneForDisplay(input: string, countryPrefix: string = "1"): string {
  const digits = input.replace(/\D/g, "");
  
  if (countryPrefix === "1") {
    let rawDigits = digits;
    let prepend1 = false;
    
    // Check if the input explicitly includes the leading '1' as a country code
    if (rawDigits.startsWith("1") && rawDigits.length > 10) {
      prepend1 = true;
      rawDigits = rawDigits.slice(1);
    } else if (input.startsWith("+1")) {
      if (rawDigits.startsWith("1")) {
        prepend1 = true;
        rawDigits = rawDigits.slice(1);
      }
    }
    
    const parts = [];
    if (rawDigits.length > 0) {
      const areaCode = rawDigits.slice(0, 3);
      parts.push(`(${areaCode}`);
      if (rawDigits.length > 3) {
        parts[0] = parts[0] + ")";
        const centralOffice = rawDigits.slice(3, 6);
        parts.push(` ${centralOffice}`);
        if (rawDigits.length > 6) {
          const lineNumber = rawDigits.slice(6, 10);
          parts.push(`-${lineNumber}`);
          if (rawDigits.length > 10) {
            parts.push(` ext. ${rawDigits.slice(10)}`);
          }
        }
      }
    }
    
    const formatted = parts.join("");
    return prepend1 ? `+1 ${formatted}` : formatted;
  }
  
  // For international/custom prefixes
  if (input.startsWith("+")) {
    return "+" + digits;
  }
  return digits;
}

/**
 * Checks whether a phone number is structurally valid.
 * For US (+1), must have exactly 10 digits (excluding optional leading '1').
 * For other countries, E.164 requires 7 to 15 digits.
 */
export function isValidPhoneNumber(input: string, countryPrefix: string = "1"): boolean {
  const digits = input.replace(/\D/g, "");
  if (!digits) return false;

  if (countryPrefix === "1") {
    return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
  }

  // General E.164 length rules: 7 to 15 digits
  if (input.trim().startsWith("+")) {
    return digits.length >= 7 && digits.length <= 15;
  }

  const totalDigits = countryPrefix.replace(/\D/g, "") + digits;
  return totalDigits.length >= 7 && totalDigits.length <= 15;
}

/**
 * Masks a phone number for UI display confirmation.
 * Returns in format: "••• ••• 1234"
 */
export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `••• ••• ${digits.slice(-4)}`;
  }
  return phone;
}
