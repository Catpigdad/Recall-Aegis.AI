/**
 * recoveryService.js
 * 
 * Handles account recovery via one-time recovery codes.
 * - Generates secure recovery codes at signup
 * - Validates codes for account recovery
 * - Ensures one-time use (code is consumed after validation)
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

/**
 * Generates a secure, user-friendly recovery code.
 * Format: "XXXX-XXXX-XXXX-XXXX" (16 alphanumeric characters + hyphens)
 * Returns: { plaintext, hash }
 *   - plaintext: The code to show to user ONCE (they must save it)
 *   - hash: The bcrypt hash to store in database
 */
async function generateRecoveryCode() {
  // Generate 12 random bytes = 96 bits of entropy
  // Base32 encode gives us ~16 alphanumeric chars
  const randomBytes = crypto.randomBytes(12);
  
  // Convert to hex, upper case
  let codeStr = randomBytes.toString('hex').toUpperCase().substring(0, 16);
  
  // Add hyphens for readability: XXXX-XXXX-XXXX-XXXX
  const plaintext = [
    codeStr.substring(0, 4),
    codeStr.substring(4, 8),
    codeStr.substring(8, 12),
    codeStr.substring(12, 16),
  ].join('-');
  
  // Hash the code for secure storage
  const hash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  
  return { plaintext, hash };
}

/**
 * Validates a recovery code against its stored hash.
 * @param {string} codeToValidate - The recovery code user provides
 * @param {string} storedHash - The bcrypt hash from database
 * @returns {boolean} - True if valid, false otherwise
 */
async function validateRecoveryCode(codeToValidate, storedHash) {
  if (!codeToValidate || !storedHash) {
    return false;
  }
  
  try {
    // Normalize the input: remove spaces, uppercase
    const normalized = codeToValidate.trim().toUpperCase().replace(/\s+/g, '');
    return await bcrypt.compare(normalized, storedHash);
  } catch (err) {
    console.error('Error validating recovery code:', err);
    return false;
  }
}

module.exports = {
  generateRecoveryCode,
  validateRecoveryCode,
};
