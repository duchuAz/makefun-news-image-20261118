'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_PNG_BYTES = 1048576;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function reject(message) {
  throw new Error('Invalid entry.png: ' + message);
}

function loadEntry() {
  const repoRoot = path.dirname(path.resolve(process.argv[1]));
  const source = path.join(repoRoot, 'entry.png');
  const bytes = fs.readFileSync(source);

  if (bytes.length > MAX_PNG_BYTES) {
    reject('file exceeds one mebibyte');
  }
  if (bytes.length < PNG_SIGNATURE.length ||
      !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    reject('PNG signature is missing');
  }
  if (bytes.length < 24 || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    reject('IHDR chunk is missing');
  }
  if (bytes.readUInt32BE(16) !== 1024 || bytes.readUInt32BE(20) !== 1024) {
    reject('dimensions are not 1024x1024');
  }
  return bytes;
}

function main() {
  const entry = loadEntry();
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'entry.png'), entry);
}

main();
