import { BadRequestException } from '@nestjs/common';
import { ImageFilePipe, imageUploadOptions, isImageBuffer, MAX_IMAGE_BYTES } from './image-upload';

const pad = (bytes: number[]) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const GIF = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(16)]);
const WEBP = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.alloc(4), Buffer.from('WEBP', 'latin1'), Buffer.alloc(8)]);

describe("Envoi d'images", () => {
  it('limite la taille à 5 Mo et à un seul fichier', () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
    expect(imageUploadOptions.limits).toEqual({ fileSize: MAX_IMAGE_BYTES, files: 1 });
  });

  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])('accepte le type %s', (mimetype) => {
    const callback = jest.fn();
    imageUploadOptions.fileFilter(null, { mimetype }, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it.each(['application/pdf', 'text/html', 'image/svg+xml', 'application/octet-stream'])('refuse le type %s', (mimetype) => {
    const callback = jest.fn();
    imageUploadOptions.fileFilter(null, { mimetype }, callback);
    expect(callback.mock.calls[0][0]).toBeInstanceOf(BadRequestException);
    expect(callback.mock.calls[0][1]).toBe(false);
  });

  it('reconnaît les vraies images à leurs premiers octets', () => {
    for (const image of [PNG, JPEG, GIF, WEBP]) expect(isImageBuffer(image)).toBe(true);
  });

  it("refuse un fichier qui n'est pas une image, même déclaré comme tel", () => {
    expect(isImageBuffer(Buffer.from('<html><script>alert(1)</script></html>'))).toBe(false);
    expect(isImageBuffer(Buffer.from('%PDF-1.7 ..............'))).toBe(false);
    expect(isImageBuffer(Buffer.alloc(0))).toBe(false);
    expect(() => new ImageFilePipe().transform({ buffer: Buffer.from('pas une image du tout') })).toThrow(BadRequestException);
  });

  it("laisse passer une vraie image et l'absence de fichier", () => {
    const pipe = new ImageFilePipe();
    expect(pipe.transform({ buffer: PNG })).toEqual({ buffer: PNG });
    expect(pipe.transform(undefined)).toBeUndefined();
  });
});
