import crypto from 'node:crypto';
import QRCode from 'qrcode';

/** Creates the unique QR code of a pet profile (UC03, basic flow step 5). */
export class QrCodeGenerator {
  /** Unique, hard-to-guess token stored with the pet. */
  generate(): string {
    return crypto.randomBytes(9).toString('base64url');
  }

  /** PNG image of the QR code, as a data URL. The code contains the address of the pet page. */
  async toDataUrl(qrCode: string): Promise<string> {
    return QRCode.toDataURL(`https://petcare.example/pet/${qrCode}`, { margin: 1, width: 240 });
  }
}
