import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Upstream encrypts OAuth configuration with machine-id + USER.
// Keep this private identity beside the encrypted file, never in the image.
const identityPath = '/data/machine-id';
try {
  writeFileSync(identityPath, randomBytes(16).toString('hex') + '\n', {
    flag: 'wx', mode: 0o600,
  });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
if (!/^[a-f0-9]{32}\n?$/.test(readFileSync(identityPath, 'utf8'))) {
  throw new Error('Invalid /data/machine-id; preserve the original OAuth identity.');
}
