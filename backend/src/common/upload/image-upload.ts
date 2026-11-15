import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** Taille maximale d'une image envoyée (photo de produit, logo de boutique). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const NOT_AN_IMAGE = 'Seules les images JPEG, PNG, WebP ou GIF sont acceptées.';

/**
 * Options de FileInterceptor : un seul fichier, 5 Mo au plus, type déclaré « image ».
 * Un fichier trop gros est refusé par multer avant d'être chargé en entier (HTTP 413).
 */
export const imageUploadOptions = {
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return callback(new BadRequestException(NOT_AN_IMAGE), false);
    }
    callback(null, true);
  },
};

/** Le type déclaré par le navigateur peut mentir : on vérifie les premiers octets du fichier. */
export function isImageBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const gif = ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('latin1'));
  const webp = buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP';
  return jpeg || png || gif || webp;
}

/** À utiliser avec @UploadedFile(ImageFilePipe) : laisse passer l'absence de fichier (image facultative). */
@Injectable()
export class ImageFilePipe implements PipeTransform {
  transform(file?: { buffer: Buffer }) {
    if (file && !isImageBuffer(file.buffer)) {
      throw new BadRequestException(NOT_AN_IMAGE);
    }
    return file;
  }
}
