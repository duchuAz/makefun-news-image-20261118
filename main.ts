'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_PNG_BYTES = 1048576;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const IHDR_LENGTH = 13;
const BIT_DEPTHS = new Set([1, 2, 4, 8, 16]);
const COLOUR_TYPES = new Set([0, 2, 3, 4, 6]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function reject(message) {
  throw new Error('Invalid entry.png: ' + message);
}

function readChunk(bytes, offset) {
  if (offset + 12 > bytes.length) reject('chunk header is truncated');
  const length = bytes.readUInt32BE(offset);
  const end = offset + 12 + length;
  if (end > bytes.length) reject('chunk body is truncated');
  return {
    type: bytes.toString('latin1', offset + 4, offset + 8),
    start: offset,
    end,
    length,
  };
}

function checkHeader(bytes, chunk) {
  if (chunk.length !== IHDR_LENGTH) reject('IHDR has the wrong length');
  const width = bytes.readUInt32BE(chunk.start + 8);
  const height = bytes.readUInt32BE(chunk.start + 12);
  if (width !== 1024 || height !== 1024) reject('dimensions are not 1024x1024');
  if (!BIT_DEPTHS.has(bytes[chunk.start + 16])) reject('bit depth is invalid');
  if (!COLOUR_TYPES.has(bytes[chunk.start + 17])) reject('colour type is invalid');
}

function inspectChunks(bytes) {
  let offset = PNG_SIGNATURE.length;
  let imageData = 0;
  let index = 0;
  let ended = false;

  while (offset < bytes.length) {
    const chunk = readChunk(bytes, offset);
    const stored = bytes.readUInt32BE(chunk.end - 4);
    const computed = crc32(bytes.subarray(chunk.start + 4, chunk.end - 4));
    if (stored !== computed) reject('chunk ' + chunk.type + ' fails its CRC');
    if (index === 0 && chunk.type !== 'IHDR') reject('first chunk is not IHDR');
    if (index > 0 && chunk.type === 'IHDR') reject('IHDR is not the first chunk');
    if (chunk.type === 'IHDR') checkHeader(bytes, chunk);
    if (chunk.type === 'IDAT') imageData += 1;
    if (chunk.type === 'IEND') {
      if (chunk.length !== 0) reject('IEND carries data');
      ended = true;
      offset = chunk.end;
      break;
    }
    offset = chunk.end;
    index += 1;
  }

  if (imageData === 0) reject('no IDAT chunk was found');
  if (!ended) reject('IEND chunk is missing');
  if (offset !== bytes.length) reject('bytes follow the IEND chunk');
}

function loadEntry() {
  const repoRoot = path.dirname(path.resolve(process.argv[1]));
  const source = path.join(repoRoot, 'entry.png');
  const bytes = fs.readFileSync(source);

  if (bytes.length > MAX_PNG_BYTES) reject('file exceeds one mebibyte');
  if (bytes.length < PNG_SIGNATURE.length + 12) reject('file is too short');
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    reject('PNG signature is missing');
  }
  inspectChunks(bytes);
  return bytes;
}

function main() {
  const entry = loadEntry();
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'entry.png'), entry);
}

main();
