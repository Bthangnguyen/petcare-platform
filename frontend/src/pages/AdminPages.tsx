import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, get, post, type User } from '../api';
import { Alert, ErrorBox, Field, PageTitle, Spinner } from '../components/ui';

type Status = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFORMATION';
type Decision = 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION';
interface AdminFacility {
  id: string; ownerId: string; name: string; address: string; area: string; phone: string;
  description: string; openingHours: string; status: Status; supportingDocumentRef: string | null;
  submittedAt: string | null; decisionNote: string | null; decidedBy: string | null; decidedAt: string | null;
}
interface FacilityDetail extends AdminFacility {
  owner: User;
  duplicates: { id: string; name: string; address: string; status: Status }[];
}
const endpoint = '/admin/facilities';
const listPath = '/admin/facilities';
const instantDate = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
});
const formatApplicationDate = (iso: string | null) => iso ? instantDate.format(new Date(iso)) : '—';
const statusLabel: Record<Status, string> = {
  PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối', NEEDS_INFORMATION: 'Cần bổ sung thông tin',
};
const decisionLabel: Record<Decision, string> = { APPROVE: 'Duyệt', REJECT: 'Từ chối', REQUEST_INFORMATION: 'Yêu cầu bổ sung' };
const confirmationLabel: Record<Decision, string> = {
  APPROVE: 'Xác nhận duyệt', REJECT: 'Xác nhận từ chối', REQUEST_INFORMATION: 'Xác nhận yêu cầu bổ sung',
};
const successMessage: Record<Decision, string> = {
  APPROVE: 'Đã duyệt cơ sở và thông báo cho chủ cơ sở.', REJECT: 'Đã từ chối hồ sơ và gửi lý do cho chủ cơ sở.',
  REQUEST_INFORMATION: 'Đã gửi yêu cầu bổ sung cho chủ cơ sở.',
};

/** UC21 — Quân. The pending count is read from the same list used by the review page. */
export function AdminHomePage() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setError(undefined);
    setCount(null);
    get<AdminFacility[]>(endpoint)
      .then(items => { if (current) setCount(items.length); })
      .catch(err => { if (current) setError(err); });
    return () => { current = false; };
  }, [attempt]);
  return <>
    <PageTitle title="Quản trị viên" />
    {error ? <>
      <ErrorBox error={error} />
      <button className="btn btn-light" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
    </> : count === null ? <Spinner /> : <div className="card">
      <h2>Hồ sơ cơ sở chờ duyệt</h2>
      <p><strong>{count}</strong> hồ sơ đang chờ xem xét.</p>
      <Link className="btn" to={listPath}>Xem hồ sơ chờ duyệt</Link>
    </div>}
  </>;
}

export function AdminFacilitiesPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'PENDING_APPROVAL';
  const [items, setItems] = useState<AdminFacility[] | null>(null);
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setItems(null);
    setError(undefined);
    get<AdminFacility[]>(`${endpoint}?${new URLSearchParams({ status })}`)
      .then(data => { if (current) setItems(data); })
      .catch(err => { if (current) setError(err); });
    return () => { current = false; };
  }, [status, attempt]);
  return <>
    <PageTitle title="Duyệt cơ sở"><Link className="btn btn-light" to="/admin">Trang quản trị</Link></PageTitle>
    <div className="card">
      <Field label="Trạng thái hồ sơ" htmlFor="admin-status">
        <select id="admin-status" value={status} onChange={event => setParams({ status: event.target.value })}>
          {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          <option value="ALL">Tất cả hồ sơ đã gửi</option>
        </select>
      </Field>
    </div>
    {error ? <>
      <ErrorBox error={error} />
      <button className="btn btn-light" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
    </> : items === null ? <Spinner /> : items.length === 0 ? <div className="card"><p>Không có hồ sơ ở trạng thái này.</p></div>
      : <div className="stack">{items.map(item => <article className="card" key={item.id} style={{ overflowWrap: 'anywhere' }}>
        <div className="row between">
          <div className="grow"><h2>{item.name}</h2><p className="muted">{item.address} · {item.area}</p></div>
          <span className="chip">{statusLabel[item.status]}</span>
        </div>
        {item.submittedAt && <p>Gửi gần nhất: {formatApplicationDate(item.submittedAt)}</p>}
        {item.decisionNote && <p><strong>Phản hồi duyệt: </strong>{item.decisionNote}</p>}
        <Link className="btn btn-light" to={`${listPath}/${item.id}`}>Xem hồ sơ</Link>
      </article>)}</div>}
  </>;
}

export function AdminFacilityReviewPage() {
  const { id } = useParams();
  return <FacilityReview key={id} id={id ?? ''} />;
}

function FacilityReview({ id }: { id: string }) {
  const [data, setData] = useState<FacilityDetail | null>(null);
  const [loadError, setLoadError] = useState<unknown>();
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    let current = true;
    setData(null);
    setLoadError(undefined);
    get<FacilityDetail>(`${endpoint}/${encodeURIComponent(id)}`)
      .then(detail => {
        if (!current) return;
        setData(detail);
        setDecision(null);
        setNote('');
        setNoteError(undefined);
        setError(undefined);
        setNeedsRefresh(false);
      })
      .catch(err => { if (current) setLoadError(err); });
    return () => { current = false; };
  }, [id, attempt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!decision || saving.current || needsRefresh || data?.status !== 'PENDING_APPROVAL') return;
    saving.current = true;
    setBusy(true);
    setError(undefined);
    setNoteError(undefined);
    try {
      const updated = await post<FacilityDetail>(`${endpoint}/${encodeURIComponent(id)}/decision`, { decision, note });
      setData(updated);
      setSuccess(successMessage[decision]);
      setDecision(null);
      setNote('');
    } catch (err) {
      setError(err);
      if (err instanceof ApiError) {
        setNoteError(err.fields.note);
        if (err.status === 409) setNeedsRefresh(true);
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (loadError) return <>
    <ErrorBox error={loadError} />
    <div className="actions">
      <button className="btn btn-light" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
      <Link to={listPath}>Về danh sách hồ sơ</Link>
    </div>
  </>;
  if (!data) return <Spinner />;

  return <>
    <PageTitle title="Xem hồ sơ cơ sở"><Link className="btn btn-light" to={listPath}>Về danh sách hồ sơ</Link></PageTitle>
    {success && <Alert kind="success">{success}</Alert>}
    <div className="card" style={{ overflowWrap: 'anywhere' }}>
      <div className="row between"><h2>{data.name}</h2><span className="chip">{statusLabel[data.status]}</span></div>
      <p><strong>Địa chỉ: </strong>{data.address}</p>
      <p><strong>Khu vực: </strong>{data.area}</p>
      <p><strong>Điện thoại cơ sở: </strong>{data.phone}</p>
      <p><strong>Giờ mở cửa: </strong>{data.openingHours}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}><strong>Mô tả: </strong>{data.description || 'Chưa có mô tả.'}</p>
      <p><strong>Tệp tài liệu hỗ trợ: </strong>{data.supportingDocumentRef || 'Chưa cung cấp tên tệp.'}</p>
      <p className="muted">Tài liệu hiện chỉ được tham chiếu bằng tên tệp, chưa có bản tải lên.</p>
      <p><strong>Gửi gần nhất: </strong>{formatApplicationDate(data.submittedAt)}</p>
      {data.decidedAt && <p><strong>Ngày quyết định: </strong>{formatApplicationDate(data.decidedAt)}</p>}
      {data.decisionNote && <p style={{ whiteSpace: 'pre-wrap' }}><strong>Phản hồi duyệt: </strong>{data.decisionNote}</p>}
    </div>
    <div className="card" style={{ overflowWrap: 'anywhere' }}>
      <h2>Chủ sở hữu cơ sở</h2>
      <p><strong>Họ tên: </strong>{data.owner.fullName}</p>
      <p><strong>E-mail: </strong>{data.owner.email}</p>
      <p><strong>Số điện thoại: </strong>{data.owner.phone}</p>
    </div>
    {data.duplicates.length > 0 && <Alert kind="warning">
      <strong>Cảnh báo trùng địa chỉ</strong>
      <p>Có cơ sở hoặc hồ sơ khác cùng địa chỉ. Hãy kiểm tra trước khi quyết định; cảnh báo không tự động chặn duyệt.</p>
      <ul className="list">{data.duplicates.map(item => <li key={item.id} style={{ overflowWrap: 'anywhere' }}>
        <Link to={`${listPath}/${item.id}`}>{item.name}</Link> — {statusLabel[item.status]} — {item.address}
      </li>)}</ul>
    </Alert>}
    <div className="card">
      <h2>Quyết định hồ sơ</h2>
      <ErrorBox error={error} />
      {data.status !== 'PENDING_APPROVAL' ? <Alert kind="info">Hồ sơ không còn chờ duyệt. Không thể quyết định thêm lần nữa.</Alert>
        : <>
          <div className="actions">{(Object.keys(decisionLabel) as Decision[]).map(value =>
            <button key={value} type="button" className={`btn ${value === 'REJECT' ? 'btn-danger' : value === 'REQUEST_INFORMATION' ? 'btn-light' : ''}`}
              disabled={busy || needsRefresh} aria-pressed={decision === value} onClick={() => {
                setDecision(value); setNoteError(undefined); setError(undefined);
              }}>{decisionLabel[value]}</button>)}</div>
          {decision && <form onSubmit={submit} noValidate aria-busy={busy} style={{ marginTop: '1rem' }}>
            <Field label={decision === 'APPROVE' ? 'Ghi chú (không bắt buộc)' : decision === 'REJECT' ? 'Lý do từ chối *' : 'Thông tin cần bổ sung *'}
              htmlFor="decision-note" error={noteError}>
              <textarea id="decision-note" rows={4} maxLength={1000} value={note} disabled={busy || needsRefresh}
                onChange={event => { setNote(event.target.value); setNoteError(undefined); setError(undefined); }}
                aria-invalid={!!noteError} aria-describedby={noteError ? 'decision-note-error' : undefined}
                style={{ width: '100%', font: 'inherit', padding: '.55rem .65rem', border: `1px solid ${noteError ? 'var(--danger)' : '#cbd5d1'}`,
                  borderRadius: 8, resize: 'vertical' }} />
            </Field>
            <p>Quyết định sẽ được lưu và thông báo cho chủ cơ sở.</p>
            <div className="actions">
              <button className={`btn ${decision === 'REJECT' ? 'btn-danger' : ''}`} type="submit" disabled={busy || needsRefresh}>
                {busy ? 'Đang lưu quyết định…' : confirmationLabel[decision]}</button>
              <button className="btn btn-light" type="button" disabled={busy} onClick={() => { setDecision(null); setNoteError(undefined); }}>Hủy lựa chọn</button>
            </div>
          </form>}
        </>}
      <div className="actions"><button className="btn btn-light" type="button" disabled={busy}
        onClick={() => { setSuccess(undefined); setAttempt(value => value + 1); }}>Tải lại hồ sơ</button></div>
    </div>
  </>;
}
