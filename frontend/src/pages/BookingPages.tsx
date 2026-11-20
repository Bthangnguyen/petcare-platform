import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, get, post, type BookingView, type NotificationItem } from '../api';
import { Alert, ErrorBox, PageTitle, Spinner } from '../components/ui';
import { STATUS_LABEL, formatDate, formatMoney, today } from '../format';

function StatusChip({ status }: { status: string }) {
  return <span className={`chip status-${status.toLowerCase()}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** UC09 Manage my bookings: upcoming and past bookings, cancellation with confirmation. */
export function MyBookingsPage() {
  const [data, setData] = useState<{ upcoming: BookingView[]; past: BookingView[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => get<{ upcoming: BookingView[]; past: BookingView[] }>('/bookings/mine').then(setData).catch(setError);
  useEffect(() => {
    load();
  }, []);

  async function cancel(b: BookingView) {
    setError(null);
    setMessage('');
    try {
      await post(`/bookings/${b.id}/cancel`);
      setMessage('Đã hủy lịch hẹn. Khung giờ được giải phóng và cơ sở đã được thông báo.');
      setConfirmId(null);
      await load();
    } catch (e) {
      setConfirmId(null);
      setError(e instanceof ApiError ? e : e);
    }
  }

  if (!data) return error ? <ErrorBox error={error} /> : <Spinner />;
  const empty = data.upcoming.length === 0 && data.past.length === 0;

  const row = (b: BookingView, upcoming: boolean) => (
    <article className="card booking" key={b.id} data-testid="booking-row">
      <div className="row between">
        <h3>
          {b.service.name} – {b.pet.name}
        </h3>
        <StatusChip status={b.status} />
      </div>
      <p>
        {b.startTime} – {b.endTime}, {formatDate(b.date)} · {b.staff.name}
      </p>
      <p className="muted">
        {b.facility.name} · {b.facility.address} · {formatMoney(b.price)}
      </p>
      {b.cancellationReason && <p className="muted">Lý do hủy: {b.cancellationReason}</p>}
      {upcoming && b.status === 'CONFIRMED' && (
        <div className="actions">
          {confirmId === b.id ? (
            <>
              <span>Hủy lịch hẹn này?</span>
              <button className="btn btn-danger" onClick={() => cancel(b)}>
                Xác nhận hủy
              </button>
              <button className="btn btn-light" onClick={() => setConfirmId(null)}>
                Không
              </button>
            </>
          ) : (
            <button className="btn btn-light" onClick={() => setConfirmId(b.id)}>
              Hủy lịch
            </button>
          )}
        </div>
      )}
    </article>
  );

  return (
    <>
      <PageTitle title="Lịch hẹn của tôi" />
      {message && <Alert kind="success">{message}</Alert>}
      <ErrorBox error={error} />
      {empty ? (
        <div className="card">
          <p>Bạn chưa có lịch hẹn nào.</p>
          <Link className="btn" to="/facilities">
            Tìm cơ sở để đặt lịch
          </Link>
        </div>
      ) : (
        <>
          <h2>Sắp tới</h2>
          {data.upcoming.length === 0 ? <p className="muted">Không có lịch hẹn sắp tới.</p> : data.upcoming.map((b) => row(b, true))}
          <h2>Đã qua</h2>
          {data.past.length === 0 ? <p className="muted">Chưa có lịch hẹn nào đã qua.</p> : data.past.map((b) => row(b, false))}
        </>
      )}
    </>
  );
}

const NEXT: Record<string, { status: string; label: string }[]> = {
  CONFIRMED: [
    { status: 'CHECKED_IN', label: 'Check-in' },
    { status: 'NO_SHOW', label: 'Vắng mặt' },
  ],
  CHECKED_IN: [{ status: 'IN_PROGRESS', label: 'Bắt đầu' }],
  IN_PROGRESS: [{ status: 'COMPLETED', label: 'Hoàn thành' }],
};

/** UC11 Manage facility bookings: the bookings of the facility of the facility owner and their status. */
export function FacilityBookingsPage() {
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<BookingView[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = () => {
    const q = new URLSearchParams();
    if (date) q.set('date', date);
    if (status) q.set('status', status);
    setItems(null);
    return get<BookingView[]>(`/facility-bookings?${q}`).then(setItems).catch(setError);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status]);

  async function change(b: BookingView, next: string, why?: string) {
    setError(null);
    try {
      await post(`/facility-bookings/${b.id}/status`, { status: next, ...(why ? { reason: why } : {}) });
      setCancelId(null);
      setReason('');
      await load();
    } catch (e) {
      setError(e);
    }
  }

  return (
    <>
      <PageTitle title="Lịch hẹn của cơ sở" />
      <div className="card filters">
        <label>
          Ngày{' '}
          <input type="date" aria-label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Trạng thái{' '}
          <select aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-light" onClick={() => setDate('')}>
          Tất cả các ngày
        </button>
      </div>
      <ErrorBox error={error} />
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Alert kind="info">Không có lịch hẹn nào phù hợp với bộ lọc.</Alert>
      ) : (
        items.map((b) => (
          <article className="card booking" key={b.id} data-testid="facility-booking-row">
            <div className="row between">
              <h3>
                {b.startTime} – {b.endTime} · {b.service.name}
              </h3>
              <StatusChip status={b.status} />
            </div>
            <p>
              {b.facility.name} · {formatDate(b.date)} · Nhân viên: {b.staff.name}
            </p>
            <p className="muted">
              Thú cưng: <strong>{b.pet.name}</strong> · Dị ứng: {b.pet.allergies.length ? b.pet.allergies.join(', ') : 'không có'}
            </p>
            <div className="actions">
              {(NEXT[b.status] ?? []).map((n) => (
                <button key={n.status} className="btn btn-light" onClick={() => change(b, n.status)}>
                  {n.label}
                </button>
              ))}
              {(b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') &&
                (cancelId === b.id ? (
                  <>
                    <input aria-label="Lý do hủy" placeholder="Lý do hủy" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <button className="btn btn-danger" onClick={() => change(b, 'CANCELLED', reason)}>
                      Xác nhận hủy
                    </button>
                  </>
                ) : (
                  <button className="btn btn-light" onClick={() => setCancelId(b.id)}>
                    Hủy lịch
                  </button>
                ))}
            </div>
          </article>
        ))
      )}
    </>
  );
}

/** UC25 View notifications (in-app). */
export function NotificationsPage() {
  const [data, setData] = useState<{ items: NotificationItem[]; unread: number } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const load = () => get<{ items: NotificationItem[]; unread: number }>('/notifications').then(setData).catch(setError);
  useEffect(() => {
    load();
  }, []);

  async function read(id: string) {
    await post(`/notifications/${id}/read`).catch(() => undefined);
    await load();
  }
  async function readAll() {
    await post('/notifications/read-all').catch(() => undefined);
    await load();
  }

  if (!data) return error ? <ErrorBox error={error} /> : <Spinner />;
  return (
    <>
      <PageTitle title="Thông báo">
        {data.unread > 0 && (
          <button className="btn btn-light" onClick={readAll}>
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </PageTitle>
      {data.items.length === 0 ? (
        <Alert kind="info">Bạn chưa có thông báo nào. Cập nhật về lịch hẹn sẽ xuất hiện ở đây.</Alert>
      ) : (
        <div className="stack">
          {data.items.map((n) => (
            <article key={n.id} className={`card notice${n.isRead ? '' : ' unread'}`}>
              <div className="row between">
                <strong>{n.title}</strong>
                <span className="muted">{new Date(n.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <p>{n.message}</p>
              {!n.isRead && (
                <button className="btn btn-light btn-small" onClick={() => read(n.id)}>
                  Đánh dấu đã đọc
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
