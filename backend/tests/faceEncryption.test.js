const test = require('node:test');
const assert = require('node:assert/strict');
const { encryptEmbeddings, decryptEmbeddings } = require('../src/utils/faceEncryption');

test('encrypts and decrypts face embeddings round-trip', () => {
  const embeddings = [
    [0.12, -0.45, 0.67, 0.91],
    [0.23, 0.34, -0.56, 0.77],
  ];

  const encrypted = encryptEmbeddings(embeddings);
  assert.ok(encrypted && typeof encrypted === 'object');
  assert.deepStrictEqual(decryptEmbeddings(encrypted), embeddings);
});
