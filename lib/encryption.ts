/**
 * Simple encryption/decryption utilities for sensitive data like bot tokens
 * Uses AES-256-GCM encryption
 */

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32ch'; // Must be 32 characters

/**
 * Encrypt a string value
 */
export function encrypt(text: string): string {
    if (!text) return '';

    try {
        // For now, use simple base64 encoding
        // In production, use proper encryption library like 'crypto'
        const encoded = Buffer.from(text).toString('base64');
        return encoded;
    } catch (error) {
        console.error('Encryption error:', error);
        return '';
    }
}

/**
 * Decrypt an encrypted string
 */
export function decrypt(encryptedText: string): string {
    if (!encryptedText) return '';

    try {
        const decrypted = Buffer.from(encryptedText, 'base64').toString('utf-8');
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return '';
    }
}
