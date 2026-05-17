import 'server-only';
import { makeFileDateCandidate, type FileDateCandidate } from '@/lib/evidence-date';

type Endian = 'little' | 'big';

function readUInt16(buffer: Buffer, offset: number, endian: Endian): number {
  return endian === 'little' ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
}

function readUInt32(buffer: Buffer, offset: number, endian: Endian): number {
  return endian === 'little' ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
}

function readAsciiValue(tiff: Buffer, entryOffset: number, endian: Endian): string | null {
  const type = readUInt16(tiff, entryOffset + 2, endian);
  const count = readUInt32(tiff, entryOffset + 4, endian);
  if (type !== 2 || count <= 0 || count > 64) return null;
  const valueOffset = count <= 4 ? entryOffset + 8 : readUInt32(tiff, entryOffset + 8, endian);
  if (valueOffset < 0 || valueOffset + count > tiff.length) return null;
  return tiff.subarray(valueOffset, valueOffset + count).toString('ascii').replace(/\0+$/, '').trim();
}

function findTagValue(tiff: Buffer, ifdOffset: number, endian: Endian, tagId: number): { ascii: string | null; long: number | null } | null {
  if (ifdOffset < 0 || ifdOffset + 2 > tiff.length) return null;
  const entryCount = readUInt16(tiff, ifdOffset, endian);
  const entriesOffset = ifdOffset + 2;
  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesOffset + index * 12;
    if (entryOffset + 12 > tiff.length) return null;
    const tag = readUInt16(tiff, entryOffset, endian);
    if (tag !== tagId) continue;
    const type = readUInt16(tiff, entryOffset + 2, endian);
    if (type === 2) return { ascii: readAsciiValue(tiff, entryOffset, endian), long: null };
    if (type === 4) return { ascii: null, long: readUInt32(tiff, entryOffset + 8, endian) };
    return { ascii: null, long: null };
  }
  return null;
}

function parseExifTiff(tiff: Buffer): FileDateCandidate | null {
  const byteOrder = tiff.subarray(0, 2).toString('ascii');
  const endian: Endian | null = byteOrder === 'II' ? 'little' : byteOrder === 'MM' ? 'big' : null;
  if (!endian || tiff.length < 8 || readUInt16(tiff, 2, endian) !== 42) return null;
  const ifd0Offset = readUInt32(tiff, 4, endian);
  const exifPointer = findTagValue(tiff, ifd0Offset, endian, 0x8769)?.long;
  const exifIfdOffset = exifPointer ?? ifd0Offset;

  const original = findTagValue(tiff, exifIfdOffset, endian, 0x9003)?.ascii;
  if (original) return makeFileDateCandidate(original, 'exif_datetime_original', 0.88);

  const digitized = findTagValue(tiff, exifIfdOffset, endian, 0x9004)?.ascii;
  if (digitized) return makeFileDateCandidate(digitized, 'exif_datetime_digitized', 0.84);

  const modified = findTagValue(tiff, ifd0Offset, endian, 0x0132)?.ascii;
  if (modified) return makeFileDateCandidate(modified, 'exif_datetime', 0.74);

  return null;
}

function parseJpegExif(content: Buffer): FileDateCandidate | null {
  if (content.length < 4 || content[0] !== 0xff || content[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= content.length) {
    if (content[offset] !== 0xff) break;
    const marker = content[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const segmentLength = content.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > content.length) break;
    if (marker === 0xe1) {
      const segmentStart = offset + 4;
      const segmentEnd = offset + 2 + segmentLength;
      const segment = content.subarray(segmentStart, segmentEnd);
      if (segment.subarray(0, 6).toString('binary') === 'Exif\0\0') {
        return parseExifTiff(segment.subarray(6));
      }
    }
    offset += 2 + segmentLength;
  }
  return null;
}

export function extractCaptureDateFromImageMetadata(input: { content: Buffer; mimeType: string }): FileDateCandidate | null {
  if (!['image/jpeg', 'image/jpg'].includes(input.mimeType.toLowerCase())) return null;
  return parseJpegExif(input.content);
}
