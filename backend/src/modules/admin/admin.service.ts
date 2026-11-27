import { z } from 'zod';
import type { AppDeps } from '../../common/deps';
import { conflict, notFound } from '../../common/errors';
import { AdminFacilityRepository, type Decision, type ReviewStatus } from './admin.repository';

export const facilityFilterSchema = z.object({
  status: z.enum(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'NEEDS_INFORMATION', 'ALL'], {
    errorMap: () => ({ message: 'Trạng thái hồ sơ không hợp lệ.' }),
  }).default('PENDING_APPROVAL'),
});
export const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_INFORMATION'], { errorMap: () => ({ message: 'Vui lòng chọn quyết định hợp lệ.' }) }),
  note: z.string({ invalid_type_error: 'Lý do phải là văn bản.' }).trim().max(1000, 'Lý do không được quá 1.000 ký tự.').default(''),
}).superRefine((input, ctx) => {
  if (input.decision !== 'APPROVE' && !input.note) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: input.decision === 'REJECT'
      ? 'Vui lòng nhập lý do từ chối.' : 'Vui lòng nhập thông tin cần bổ sung.' });
  }
});
export type DecisionInput = z.infer<typeof decisionSchema>;
const resultStatus = { APPROVE: 'APPROVED', REJECT: 'REJECTED', REQUEST_INFORMATION: 'NEEDS_INFORMATION' } as const;
const decisionTitle: Record<Decision, string> = {
  APPROVE: 'Cơ sở đã được duyệt', REJECT: 'Hồ sơ cơ sở bị từ chối', REQUEST_INFORMATION: 'Hồ sơ cơ sở cần bổ sung thông tin',
};

/** UC21: conditional status update, decision metadata, audit and owner notification commit atomically. */
export class AdminFacilityService {
  private readonly repo: AdminFacilityRepository;
  constructor(private readonly deps: Pick<AppDeps, 'db' | 'clock' | 'identity' | 'notifications'>) {
    this.repo = new AdminFacilityRepository(deps.db);
  }

  list(status: ReviewStatus | 'ALL') {
    return this.repo.list(status);
  }

  get(id: string) {
    const application = this.repo.find(id);
    if (!application) throw notFound('Không tìm thấy hồ sơ cơ sở đã gửi duyệt.');
    return { ...application, owner: this.deps.identity.getPublicUserById(application.ownerId),
      duplicates: this.repo.duplicatesOf(application.id, application.address) };
  }

  decide(actorId: string, id: string, input: DecisionInput) {
    return this.deps.db.transaction(() => {
      const current = this.repo.find(id);
      if (!current) throw notFound('Không tìm thấy hồ sơ cơ sở đã gửi duyệt.');
      const now = this.deps.clock.now().toISOString();
      if (!this.repo.decide(id, resultStatus[input.decision], actorId, input.note, now)) {
        throw conflict('APPLICATION_ALREADY_DECIDED', 'Hồ sơ không còn ở trạng thái chờ duyệt. Vui lòng tải lại trước khi quyết định.');
      }
      this.repo.recordDecision(id, actorId, input.decision, input.note, now);
      const detail = this.get(id);
      const message = input.decision === 'APPROVE'
        ? `Cơ sở ${current.name} đã được duyệt. Cơ sở sẽ xuất hiện trong tìm kiếm khi có dịch vụ hoạt động.${input.note ? ` Ghi chú: ${input.note}` : ''}`
        : `Hồ sơ cơ sở ${current.name}: ${input.note} Bạn có thể sửa hồ sơ và gửi lại.`;
      this.deps.notifications.notify(current.ownerId, 'FACILITY_DECISION', decisionTitle[input.decision], message, { type: 'FACILITY', id });
      return detail;
    }).immediate();
  }
}
