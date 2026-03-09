// Unit tests for the crypto service
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 64 hex chars for test

const { encrypt, decrypt } = require('../../services/cryptoService');

describe('cryptoService', () => {
  test('encrypts and decrypts a string correctly', () => {
    const plaintext = 'We discussed planning a trip to Japan.';
    const { ciphertext, iv, tag } = encrypt(plaintext);

    expect(ciphertext).toBeDefined();
    expect(iv).toBeDefined();
    expect(tag).toBeDefined();
    expect(ciphertext).not.toBe(plaintext);

    const decrypted = decrypt(ciphertext, iv, tag);
    expect(decrypted).toBe(plaintext);
  });

  test('produces different ciphertext for the same plaintext (random IV)', () => {
    const plaintext = 'Test message';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  test('throws on tampered ciphertext', () => {
    const plaintext = 'Sensitive conversation data';
    const { ciphertext, iv, tag } = encrypt(plaintext);
    const tampered = ciphertext.slice(0, -2) + 'ff';
    expect(() => decrypt(tampered, iv, tag)).toThrow();
  });

  test('throws on tampered tag', () => {
    const plaintext = 'Sensitive conversation data';
    const { ciphertext, iv } = encrypt(plaintext);
    const badTag = 'a'.repeat(32);
    expect(() => decrypt(ciphertext, iv, badTag)).toThrow();
  });
});
