// Простая обертка. В продакшене использовать crypto с секретным ключом.
export function encrypt(text: string): string {
  return Buffer.from(text).toString('base64');
}

export function decrypt(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

