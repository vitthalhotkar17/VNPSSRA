const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.FACE_ENCRYPTION_KEY || 'sams-face-key-32-chars-1234';
const IV_LENGTH = 16;

function encryptEmbeddings(embeddings) {
  const plainText = JSON.stringify(embeddings);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plainText, 'utf8')), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
  };
}

function decryptEmbeddings(payload) {
  if (!payload?.data || !payload?.iv) return [];
  const iv = Buffer.from(payload.iv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.data, 'hex')), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = { encryptEmbeddings, decryptEmbeddings };
