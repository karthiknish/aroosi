import bcrypt from 'bcryptjs';

/**
 * Password hashing and verification utilities
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a password with bcrypt
   * @param password - Plain text password
   * @returns Promise<string> - Hashed password
   */
  static async hash(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns Promise<boolean> - Whether password matches hash
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   * @param password - Plain text password
   * @returns Object with validation results
   */
  static validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '123456', '12345678', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and weak');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a secure random password
   * @param length - Password length (default: 16)
   * @returns string - Generated password
   */
  static generatePassword(length = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each set
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}