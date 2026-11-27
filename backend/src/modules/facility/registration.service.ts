import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AppDeps } from '../../common/deps';
import { conflict, notFound } from '../../common/errors';
import { FacilityRegistrationRepository, type FacilityApplication } from './registration.repository';

/** Drafts can omit required fields; supplied values still obey length and phone format limits. */
export const registrationSchema = z.object({
  name: z.string().trim().max(100, 'Tên cơ sở không được quá 100 ký tự.').default(''),
  address: z.string().trim().max(250, 'Địa chỉ không được quá 250 ký tự.').default(''),
  area: z.string().trim().max(100, 'Khu vực không được quá 100 ký tự.').default(''),
  phone: z.string().trim().max(20, 'Số điện thoại quá dài.').default(''),
  description: z.string().trim().max(2000, 'Mô tả không được quá 2.000 ký tự.').default(''),
  openingHours: z.string().trim().max(200, 'Giờ mở cửa không được quá 200 ký tự.').default(''),
  supportingDocumentRef: z.string().trim().max(255, 'Tên tệp không được quá 255 ký tự.').default(''),
  saveDraft: z.boolean().optional().default(false),
}).superRefine((input, ctx) => {
  const required = {
    name: 'Vui lòng nhập tên cơ sở.', address: 'Vui lòng nhập địa chỉ.', area: 'Vui lòng nhập khu vực.',
    phone: 'Vui lòng nhập số điện thoại.', openingHours: 'Vui lòng nhập giờ mở cửa.',
  } as const;
  if (!input.saveDraft) {
    for (const key of Object.keys(required) as (keyof typeof required)[]) {
      if (!input[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: required[key] });
    }
  }
  if (input.phone && !/^(0|\+84)\d{9,10}$/.test(input.phone)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Số điện thoại không hợp lệ.' });
  }
});
export type RegistrationInput = z.infer<typeof registrationSchema>;
export const canEditApplication = (status: FacilityApplication['status']) => ['DRAFT', 'NEEDS_INFORMATION', 'REJECTED'].includes(status);

/** UC12 business rules. The write and all admin notices commit together. */
export class FacilityRegistrationService {
  private readonly repo: FacilityRegistrationRepository;
  constructor(private readonly deps: Pick<AppDeps, 'db' | 'clock' | 'identity' | 'notifications'>) {
    this.repo = new FacilityRegistrationRepository(deps.db);
  }

  list(ownerId: string) {
    return this.repo.listOf(ownerId);
  }

  get(ownerId: string, id: string): FacilityApplication {
    const application = this.repo.findOf(ownerId, id);
    if (!application) throw notFound('Không tìm thấy hồ sơ cơ sở.');
    return application;
  }

  private notifyAdmins(application: FacilityApplication): void {
    for (const adminId of this.deps.identity.listActiveAdminIds()) {
      this.deps.notifications.notify(adminId, 'FACILITY_APPLICATION', 'Có hồ sơ cơ sở chờ duyệt',
        `Cơ sở ${application.name} đã gửi hồ sơ đăng ký và đang chờ duyệt.`, { type: 'FACILITY', id: application.id });
    }
  }

  create(ownerId: string, input: RegistrationInput): FacilityApplication {
    return this.deps.db.transaction(() => {
      const id = randomUUID();
      this.repo.insert(id, ownerId, input, input.saveDraft ? 'DRAFT' : 'PENDING_APPROVAL',
        input.saveDraft ? null : this.deps.clock.now().toISOString());
      const application = this.get(ownerId, id);
      if (!input.saveDraft) this.notifyAdmins(application);
      return application;
    }).immediate();
  }

  update(ownerId: string, id: string, input: RegistrationInput): FacilityApplication {
    return this.deps.db.transaction(() => {
      const current = this.get(ownerId, id);
      if (!canEditApplication(current.status)) throw conflict('APPLICATION_NOT_EDITABLE', 'Hồ sơ đang chờ duyệt hoặc đã được duyệt, không thể chỉnh sửa.');
      const changed = this.repo.update(id, ownerId, input, input.saveDraft ? 'DRAFT' : 'PENDING_APPROVAL',
        input.saveDraft ? null : this.deps.clock.now().toISOString());
      if (!changed) throw conflict('APPLICATION_NOT_EDITABLE', 'Trạng thái hồ sơ đã thay đổi. Vui lòng tải lại.');
      const application = this.get(ownerId, id);
      if (!input.saveDraft) this.notifyAdmins(application);
      return application;
    }).immediate();
  }
}
