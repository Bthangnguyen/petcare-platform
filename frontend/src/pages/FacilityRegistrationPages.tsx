import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError, get, post, put } from '../api';
import { Alert, ErrorBox, Field, PageTitle, Spinner } from '../components/ui';
import { formatDate } from '../format';

type ApplicationStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'NEEDS_INFORMATION' | 'APPROVED' | 'REJECTED';
interface ApplicationForm {
  name: string; address: string; area: string; phone: string; description: string;
  openingHours: string; supportingDocumentRef: string;
}
interface FacilityApplication extends Omit<ApplicationForm, 'supportingDocumentRef'> {
  id: string; status: ApplicationStatus; supportingDocumentRef: string | null;
  submittedAt: string | null; decisionNote: string | null; decidedAt: string | null;
}

const path = '/facility-owner/applications';
const listPath = '/facility/applications';
const statusLabel: Record<ApplicationStatus, string> = {
  DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Chờ duyệt', NEEDS_INFORMATION: 'Cần bổ sung thông tin',
  APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối',
};
const editable = (status: ApplicationStatus) => ['DRAFT', 'NEEDS_INFORMATION', 'REJECTED'].includes(status);
const emptyForm: ApplicationForm = { name: '', address: '', area: '', phone: '', description: '', openingHours: '', supportingDocumentRef: '' };

/** UC12 — Quân. Only the current facility owner's applications are returned by the API. */
export function FacilityApplicationsPage() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [items, setItems] = useState<FacilityApplication[] | null>(null);
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setError(undefined);
    get<FacilityApplication[]>(path)
      .then(data => { if (current) setItems(data); })
      .catch(err => { if (current) setError(err); });
    return () => { current = false; };
  }, [attempt]);

  return <>
    <PageTitle title="Hồ sơ đăng ký cơ sở">
      <Link className="btn" to={`${listPath}/new`}>Đăng ký cơ sở mới</Link>
    </PageTitle>
    {notice && <Alert kind="success">{notice}</Alert>}
    <p className="muted">Theo dõi hồ sơ và phản hồi duyệt. Cơ sở chỉ được công khai sau khi được duyệt và có dịch vụ hoạt động.</p>
    {error ? <>
      <ErrorBox error={error} />
      <button className="btn btn-light" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
    </> : items === null ? <Spinner /> : items.length === 0 ? <div className="card">
      <p>Bạn chưa đăng ký cơ sở nào. Tạo hồ sơ mới hoặc lưu nháp để hoàn thiện sau.</p>
    </div> : <div className="stack">
      {items.map(item => <article className="card" key={item.id} style={{ overflowWrap: 'anywhere' }}>
        <div className="row between">
          <div className="grow">
            <h2>{item.name || 'Cơ sở chưa đặt tên'}</h2>
            <p className="muted">{item.address || 'Chưa có địa chỉ'}{item.area && ` · ${item.area}`}</p>
          </div>
          <span className="chip">{statusLabel[item.status]}</span>
        </div>
        {item.submittedAt && <p className="muted">Gửi gần nhất: {formatDate(item.submittedAt)}</p>}
        {item.decisionNote && <Alert kind="warning"><strong>Phản hồi duyệt: </strong>{item.decisionNote}</Alert>}
        {item.status === 'PENDING_APPROVAL' && <p>Hồ sơ đang được xem xét. Bạn có thể chỉnh sửa khi được yêu cầu bổ sung hoặc bị từ chối.</p>}
        <Link className="btn btn-light" to={`${listPath}/${item.id}/edit`}>
          {editable(item.status) ? 'Sửa hồ sơ' : 'Xem hồ sơ'}
        </Link>
      </article>)}
    </div>}
  </>;
}

export function FacilityApplicationFormPage() {
  const { id } = useParams();
  return <ApplicationFormPage key={id ?? 'new'} id={id} />;
}

function ApplicationFormPage({ id }: { id?: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<ApplicationForm>(emptyForm);
  const [application, setApplication] = useState<FacilityApplication>();
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState<unknown>();
  const [error, setError] = useState<unknown>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [intent, setIntent] = useState<'draft' | 'submit' | null>(null);
  const saving = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const readOnly = !!application && !editable(application.status);
  const set = (key: keyof ApplicationForm) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setForm(current => ({ ...current, [key]: value }));
    setFields(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(undefined);
  };

  useEffect(() => {
    if (!id) return;
    let current = true;
    setLoading(true);
    setLoadError(undefined);
    get<FacilityApplication>(`${path}/${encodeURIComponent(id)}`)
      .then(data => {
        if (!current) return;
        setApplication(data);
        setForm({ name: data.name, address: data.address, area: data.area, phone: data.phone,
          description: data.description, openingHours: data.openingHours, supportingDocumentRef: data.supportingDocumentRef ?? '' });
      })
      .catch(err => { if (current) setLoadError(err); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [id, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || readOnly) return;
    const saveDraft = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'draft';
    saving.current = true;
    setIntent(saveDraft ? 'draft' : 'submit');
    setFields({});
    setError(undefined);
    try {
      const input = { ...form, saveDraft };
      if (id) await put<FacilityApplication>(`${path}/${encodeURIComponent(id)}`, input);
      else await post<FacilityApplication>(path, input);
      navigate(listPath, { state: { notice: saveDraft ? 'Đã lưu bản nháp. Bạn có thể tiếp tục chỉnh sửa sau.'
        : 'Đã gửi hồ sơ chờ duyệt. Quản trị viên đã được thông báo. Cơ sở sẽ được công khai sau khi được duyệt và có dịch vụ hoạt động.' } });
    } catch (err) {
      if (err instanceof ApiError) setFields(err.fields);
      setError(err);
    } finally {
      saving.current = false;
      setIntent(null);
    }
  }

  if (loading) return <Spinner />;
  if (loadError) return <>
    <ErrorBox error={loadError} />
    <div className="actions">
      <button className="btn btn-light" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
      <Link to={listPath}>Về danh sách hồ sơ</Link>
    </div>
  </>;

  return <div className="card" style={{ maxWidth: 760, margin: '0 auto', overflowWrap: 'anywhere' }}>
    <h1>{readOnly ? 'Xem hồ sơ cơ sở' : id ? 'Sửa hồ sơ cơ sở' : 'Đăng ký cơ sở'}</h1>
    {application && <p>Trạng thái: <span className="chip">{statusLabel[application.status]}</span></p>}
    {application?.decisionNote && <Alert kind="warning"><strong>Phản hồi duyệt: </strong>{application.decisionNote}</Alert>}
    {readOnly ? <Alert kind="info">Hồ sơ đang chờ duyệt hoặc đã được duyệt nên không thể chỉnh sửa.</Alert>
      : <p className="muted">Các trường có dấu * bắt buộc khi gửi duyệt. Bạn có thể lưu nháp hồ sơ chưa đầy đủ.</p>}
    <ErrorBox error={error} />
    <form onSubmit={submit} noValidate aria-busy={intent !== null}>
      <fieldset disabled={readOnly || intent !== null} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <Field label="Tên cơ sở *" htmlFor="facility-name" error={fields.name}>
          <input id="facility-name" value={form.name} onChange={set('name')} maxLength={100}
            autoComplete="organization" aria-invalid={!!fields.name} aria-describedby={fields.name ? 'facility-name-error' : undefined} />
        </Field>
        <Field label="Địa chỉ *" htmlFor="facility-address" error={fields.address}>
          <input id="facility-address" value={form.address} onChange={set('address')} maxLength={250}
            autoComplete="street-address" aria-invalid={!!fields.address} aria-describedby={fields.address ? 'facility-address-error' : undefined} />
        </Field>
        <div className="grid-2">
          <Field label="Khu vực *" htmlFor="facility-area" error={fields.area} hint="Ví dụ: Quận 1, Thủ Đức.">
            <input id="facility-area" value={form.area} onChange={set('area')} maxLength={100}
              aria-invalid={!!fields.area} aria-describedby={fields.area ? 'facility-area-error' : undefined} />
          </Field>
          <Field label="Số điện thoại *" htmlFor="facility-phone" error={fields.phone}>
            <input id="facility-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} maxLength={20}
              aria-invalid={!!fields.phone} aria-describedby={fields.phone ? 'facility-phone-error' : undefined} />
          </Field>
        </div>
        <Field label="Giờ mở cửa *" htmlFor="facility-hours" error={fields.openingHours} hint="Ví dụ: 08:00–17:00, thứ Hai đến thứ Bảy.">
          <input id="facility-hours" value={form.openingHours} onChange={set('openingHours')} maxLength={200}
            aria-invalid={!!fields.openingHours} aria-describedby={fields.openingHours ? 'facility-hours-error' : undefined} />
        </Field>
        <Field label="Mô tả cơ sở" htmlFor="facility-description" error={fields.description}>
          <textarea id="facility-description" value={form.description} onChange={set('description')} maxLength={2000} rows={4}
            style={{ width: '100%', font: 'inherit', padding: '.55rem .65rem', border: `1px solid ${fields.description ? 'var(--danger)' : '#cbd5d1'}`,
              background: fields.description ? '#fff7f7' : '#fff', borderRadius: 8, resize: 'vertical' }}
            aria-invalid={!!fields.description} aria-describedby={fields.description ? 'facility-description-error' : undefined} />
        </Field>
        <Field label="Tên tệp giấy phép / tài liệu hỗ trợ" htmlFor="facility-document" error={fields.supportingDocumentRef}
          hint="Chỉ nhập tên tệp để tham chiếu, ví dụ giay-phep.pdf. Chưa hỗ trợ tải tệp lên.">
          <input id="facility-document" value={form.supportingDocumentRef} onChange={set('supportingDocumentRef')} maxLength={255}
            aria-invalid={!!fields.supportingDocumentRef} aria-describedby={fields.supportingDocumentRef ? 'facility-document-error' : undefined} />
        </Field>
        {!readOnly && <div className="actions">
          <button className="btn" type="submit" value="submit" disabled={intent !== null}>{intent === 'submit' ? 'Đang gửi…' : 'Gửi duyệt'}</button>
          <button className="btn btn-light" type="submit" value="draft" disabled={intent !== null}>{intent === 'draft' ? 'Đang lưu…' : 'Lưu nháp'}</button>
        </div>}
      </fieldset>
      <div className="actions"><Link className="btn btn-light" to={listPath}>Về danh sách hồ sơ</Link></div>
    </form>
  </div>;
}
