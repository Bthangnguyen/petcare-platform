import type { SeedHook } from './context';
import { randomUUID } from 'node:crypto';

/** UC21 — Quân. A pending application shares the address of an approved facility to demonstrate the duplicate warning. */
export const seedUc21: SeedHook = (db, ctx) => {
  const id = randomUUID();
  db.prepare(`INSERT INTO facilities (id, owner_id, name, address, area, phone, description, opening_hours, status, owner_suspended)
    SELECT ?, ?, 'Happy Paws Quận 1 (chờ duyệt)', address, area, '0902345678',
      'Hồ sơ mẫu cần kiểm tra trùng địa chỉ trước khi quyết định.', '08:00–17:00, thứ Hai đến thứ Bảy', 'PENDING_APPROVAL', 0
    FROM facilities WHERE id=?`).run(id, ctx.users['hung.fo@example.com'], ctx.ids.spa);
  db.prepare(`INSERT INTO facility_applications (facility_id, supporting_document_ref, submitted_at) VALUES (?, ?, ?)`)
    .run(id, 'giay-phep-co-so-quan-1.pdf', ctx.createdAt);
};
