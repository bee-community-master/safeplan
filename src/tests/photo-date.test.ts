import { describe, expect, it } from 'vitest';
import { extractCaptureDateFromImageMetadata } from '@/server/files/photo-date';

function makeJpegWithDateTimeOriginal(dateTime: string): Buffer {
  const asciiDate = Buffer.from(`${dateTime}\0`, 'ascii');
  const ifd0Offset = 8;
  const exifIfdOffset = 26;
  const dateValueOffset = 44;
  const tiff = Buffer.alloc(dateValueOffset + asciiDate.length);

  tiff.write('II', 0, 'ascii');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(ifd0Offset, 4);

  tiff.writeUInt16LE(1, ifd0Offset);
  const exifPointerEntry = ifd0Offset + 2;
  tiff.writeUInt16LE(0x8769, exifPointerEntry);
  tiff.writeUInt16LE(4, exifPointerEntry + 2);
  tiff.writeUInt32LE(1, exifPointerEntry + 4);
  tiff.writeUInt32LE(exifIfdOffset, exifPointerEntry + 8);
  tiff.writeUInt32LE(0, exifPointerEntry + 12);

  tiff.writeUInt16LE(1, exifIfdOffset);
  const dateEntry = exifIfdOffset + 2;
  tiff.writeUInt16LE(0x9003, dateEntry);
  tiff.writeUInt16LE(2, dateEntry + 2);
  tiff.writeUInt32LE(asciiDate.length, dateEntry + 4);
  tiff.writeUInt32LE(dateValueOffset, dateEntry + 8);
  tiff.writeUInt32LE(0, dateEntry + 12);
  asciiDate.copy(tiff, dateValueOffset);

  const segment = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(segment.length + 2, 0);
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), length, segment, Buffer.from([0xff, 0xd9])]);
}

describe('photo metadata capture date extraction', () => {
  it('reads DateTimeOriginal from JPEG EXIF metadata', () => {
    const candidate = extractCaptureDateFromImageMetadata({
      content: makeJpegWithDateTimeOriginal('2024:03:05 08:09:10'),
      mimeType: 'image/jpeg'
    });

    expect(candidate).toEqual({
      date: '2024-03-05',
      source: 'metadata',
      confidence: 0.88,
      sourceDetail: 'exif_datetime_original'
    });
  });

  it('ignores unsupported image metadata containers without guessing', () => {
    expect(extractCaptureDateFromImageMetadata({ content: Buffer.from('not png metadata'), mimeType: 'image/png' })).toBeNull();
  });
});
