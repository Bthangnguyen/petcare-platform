import type { SeedHook } from './context';
import { randomUUID } from 'node:crypto';

/** UC12 — Quân. Draft and decision feedback can be demonstrated before UC21 is implemented. */
export const seedUc12: SeedHook = (db, ctx) => {
  const insertFacility = db.prepare(`INSERT INTO facilities
    (id, owner_id, name, address, area, phone, description, opening_hours, status, owner_suspended)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`);
  const insertApplication = db.prepare(`INSERT INTO facility_applications
    (facility_id, supporting_document_ref, submitted_at, decision_note, decided_by, decided_at)
    VALUES (?, ?, ?, ?, ?, ?)`);
  for (const item of [
    { email: 'lan.fo@example.com', name: 'Happy Paws cơ sở mới (bản nháp)', status: 'DRAFT', note: null, document: null },
    { email: 'lan.fo@example.com', name: 'Happy Paws Riverside', status: 'NEEDS_INFORMATION', note: 'Vui lòng bổ sung tên tệp giấy phép kinh doanh và giờ mở cửa chính xác.', document: null },
    { email: 'hung.fo@example.com', name: 'Pet Care cơ sở mới', status: 'REJECTED', note: 'Vui lòng kiểm tra lại địa chỉ cơ sở và thông tin liên hệ trước khi gửi lại.', document: 'giay-phep-cu.pdf' },
  ]) {
    const id = randomUUID();
    const draft = item.status === 'DRAFT';
    insertFacility.run(id, ctx.users[item.email], item.name, draft ? '' : '18 Nguyễn Hữu Cảnh, Bình Thạnh, TP. Hồ Chí Minh',
      draft ? '' : 'Bình Thạnh', draft ? '' : '0902345678', '', draft ? '' : '08:00–17:00, thứ Hai đến thứ Bảy', item.status);
    insertApplication.run(id, item.document, draft ? null : ctx.createdAt, item.note,
      draft ? null : ctx.users['admin@example.com'], draft ? null : ctx.createdAt);
  }
};
