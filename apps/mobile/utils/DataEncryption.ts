import CryptoJS from 'crypto-js';
import { secureStorage } from './storage';
import { errorHandler } from './errorHandling';

export interface EncryptionSettings {
  encryptionEnabled: boolean;
  keyDerivationIterations: number;
  algorithm: string;
}

const ENCRYPTION_KEY_STORAGE = 'encryption_master_key';
const ENCRYPTION_SETTINGS_STORAGE = 'encryption_settings';
const DEFAULT_ITERATIONS = 10000;

class DataEncryptionService {
  private masterKey: string | null = null;
  private settings: EncryptionSettings | null = null;

  async initialize(): Promise<void> {
    try {
      await this.loadSettings();
      await this.loadMasterKey();
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'DataEncryption', action: 'initialize' });
    }
  }

  private async loadSettings(): Promise<void> {
    this.settings = await secureStorage.get<EncryptionSettings>(ENCRYPTION_SETTINGS_STORAGE);
    if (!this.settings) {
      this.settings = {
        encryptionEnabled: false,
        keyDerivationIterations: DEFAULT_ITERATIONS,
        algorithm: 'AES',
      };
      await this.saveSettings();
    }
  }

  private async saveSettings(): Promise<void> {
    if (this.settings) {
      await secureStorage.set(ENCRYPTION_SETTINGS_STORAGE, this.settings);
    }
  }

  private async loadMasterKey(): Promise<void> {
    this.masterKey = await secureStorage.get<string>(ENCRYPTION_KEY_STORAGE);
  }

  private async saveMasterKey(): Promise<void> {
    if (this.masterKey) {
      await secureStorage.set(ENCRYPTION_KEY_STORAGE, this.masterKey);
    }
  }

  /**
   * Generate a cryptographically secure master key
   */
  private generateMasterKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString(CryptoJS.enc.Hex);
  }

  /**
   * Derive encryption key from master key and salt
   */
  private deriveKey(masterKey: string, salt: string): string {
    const iterations = this.settings?.keyDerivationIterations || DEFAULT_ITERATIONS;
    return CryptoJS.PBKDF2(masterKey, salt, {
      keySize: 256/32,
      iterations: iterations,
    }).toString(CryptoJS.enc.Hex);
  }

  /**
   * Generate a random salt
   */
  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128/8).toString(CryptoJS.enc.Hex);
  }

  /**
   * Enable data encryption
   */
  async enableEncryption(userPassphrase?: string): Promise<boolean> {
    try {
      await this.initialize();

      // Generate or derive master key
      if (userPassphrase) {
        const salt = this.generateSalt();
        this.masterKey = this.deriveKey(userPassphrase, salt);
      } else {
        this.masterKey = this.generateMasterKey();
      }

      await this.saveMasterKey();

      if (this.settings) {
        this.settings.encryptionEnabled = true;
        await this.saveSettings();
      }

      return true;
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'DataEncryption', action: 'enableEncryption' });
      return false;
    }
  }

  /**
   * Disable data encryption
   */
  async disableEncryption(): Promise<void> {
    await this.initialize();

    if (this.settings) {
      this.settings.encryptionEnabled = false;
      await this.saveSettings();
    }

    this.masterKey = null;
    await secureStorage.remove(ENCRYPTION_KEY_STORAGE);
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: any): Promise<string | null> {
    try {
      await this.initialize();

      if (!this.settings?.encryptionEnabled || !this.masterKey) {
        // Return data as JSON string if encryption is disabled
        return JSON.stringify(data);
      }

      const salt = this.generateSalt();
      const key = this.deriveKey(this.masterKey, salt);
      const iv = CryptoJS.lib.WordArray.random(128/8);

      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Combine salt, IV, and encrypted data
      const encryptedData = {
        salt: salt,
        iv: iv.toString(CryptoJS.enc.Hex),
        data: encrypted.toString(),
      };

      return JSON.stringify(encryptedData);
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'DataEncryption', action: 'encryptData' });
      return null;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData<T>(encryptedString: string): Promise<T | null> {
    try {
      await this.initialize();

      if (!this.settings?.encryptionEnabled || !this.masterKey) {
        // Try to parse as JSON if encryption is disabled
        try {
          return JSON.parse(encryptedString);
        } catch {
          return null;
        }
      }

      const encryptedData = JSON.parse(encryptedString);
      
      if (!encryptedData.salt || !encryptedData.iv || !encryptedData.data) {
        // Might be unencrypted legacy data
        try {
          return JSON.parse(encryptedString);
        } catch {
          return null;
        }
      }

      const key = this.deriveKey(this.masterKey, encryptedData.salt);
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'DataEncryption', action: 'decryptData' });
      return null;
    }
  }

  /**
   * Encrypt and store data securely
   */
  async encryptAndStore(key: string, data: any): Promise<boolean> {
    try {
      const encryptedData = await this.encryptData(data);
      if (encryptedData) {
        await secureStorage.set(`encrypted_${key}`, encryptedData);
        return true;
      }
      return false;
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'DataEncryption', action: 'encryptAndStore' });
      return false;
    }
  }

  /**
   * Retrieve and decrypt stored data
   */
  async retrieveAndDecrypt<T>(key: string): Promise<T | null> {
    try {
      const encryptedData = await secureStorage.get<string>(`encrypted_${key}`);
      if (encryptedData) {
        return await this.decryptData<T>(encryptedData);
      }
      return null;
    } catch (error) {
      errorHandler.handle(error as Error, { component: 'DataEncryption', action: 'retrieveAndDecrypt' });
      return null;
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hashData(data: string, salt?: string): string {
    const useSalt = salt || this.generateSalt();
    return CryptoJS.PBKDF2(data, useSalt, {
      keySize: 256/32,
      iterations: this.settings?.keyDerivationIterations || DEFAULT_ITERATIONS,
    }).toString(CryptoJS.enc.Hex);
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    try {
      const computedHash = CryptoJS.PBKDF2(data, salt, {
        keySize: 256/32,
        iterations: this.settings?.keyDerivationIterations || DEFAULT_ITERATIONS,
      }).toString(CryptoJS.enc.Hex);
      
      return computedHash === hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if encryption is enabled
   */
  async isEncryptionEnabled(): Promise<boolean> {
    await this.initialize();
    return this.settings?.encryptionEnabled || false;
  }

  /**
   * Get encryption settings
   */
  async getSettings(): Promise<EncryptionSettings | null> {
    await this.initialize();
    return this.settings;
  }

  /**
   * Update encryption settings
   */
  async updateSettings(newSettings: Partial<EncryptionSettings>): Promise<void> {
    await this.initialize();
    
    if (this.settings) {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
    }
  }

  /**
   * Securely wipe data from memory
   */
  private secureWipe(data: string): void {
    // In JavaScript, we can't truly securely wipe memory,
    // but we can overwrite the reference
    data = '';
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Test encryption/decryption functionality
   */
  async testEncryption(): Promise<boolean> {
    try {
      const testData = { test: 'encryption test', timestamp: Date.now() };
      const encrypted = await this.encryptData(testData);
      
      if (!encrypted) return false;
      
      const decrypted = await this.decryptData(encrypted);
      
      return JSON.stringify(testData) === JSON.stringify(decrypted);
    } catch (error) {
      return false;
    }
  }
}

export const dataEncryption = new DataEncryptionService();

// Hook for easy use in components
export const useDataEncryption = () => {
  return {
    enableEncryption: (userPassphrase?: string) => 
      dataEncryption.enableEncryption(userPassphrase),
    disableEncryption: () => dataEncryption.disableEncryption(),
    encryptData: (data: any) => dataEncryption.encryptData(data),
    decryptData: <T>(encryptedString: string) => 
      dataEncryption.decryptData<T>(encryptedString),
    encryptAndStore: (key: string, data: any) => 
      dataEncryption.encryptAndStore(key, data),
    retrieveAndDecrypt: <T>(key: string) => 
      dataEncryption.retrieveAndDecrypt<T>(key),
    hashData: (data: string, salt?: string) => dataEncryption.hashData(data, salt),
    verifyHash: (data: string, hash: string, salt: string) => 
      dataEncryption.verifyHash(data, hash, salt),
    isEncryptionEnabled: () => dataEncryption.isEncryptionEnabled(),
    getSettings: () => dataEncryption.getSettings(),
    updateSettings: (settings: Partial<EncryptionSettings>) => 
      dataEncryption.updateSettings(settings),
    generateSecurePassword: (length?: number) => 
      dataEncryption.generateSecurePassword(length),
    testEncryption: () => dataEncryption.testEncryption(),
  };
};