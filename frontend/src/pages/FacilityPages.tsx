import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, get, post, type Availability, type BookingView, type FacilityDetail, type FacilitySummary, type FreeSlot, type Pet, type Service } from '../api';
import { useAuth } from '../auth';
import { Alert, ErrorBox, Field, PageTitle, Spinner } from '../components/ui';
import { TYPE_LABEL, formatDate, formatMoney, today, weekdayLabel } from '../format';

const AREAS = ['Quận 1', 'Quận 3', 'Bình Thạnh', 'Thủ Đức'];

/** UC06 Search facilities: area, service type, price filter and sorting; no login is needed. */
export function FacilitiesPage() {
  const [filters, setFilters] = useState({ area: '', type: '', maxPrice: '', sort: 'name' });
  const [results, setResults] = useState<FacilitySummary[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  function search(f = filters) {
    const q = new URLSearchParams();
    if (f.area) q.set('area', f.area);
    if (f.type) q.set('type', f.type);
    if (f.maxPrice) q.set('maxPrice', f.maxPrice);
    q.set('sort', f.sort);
    setError(null);
    get<FacilitySummary[]>(`/facilities?${q}`).then(setResults).catch(setError);
  }
  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    search();
  }
  function sortBy(sort: string) {
    const f = { ...filters, sort };
    setFilters(f);
    search(f);
  }

  return (
    <>
      <PageTitle title="Tìm cơ sở chăm sóc thú cưng" />
      <form className="card filters" onSubmit={submit}>
        <Field label="Khu vực" htmlFor="area">
          <select id="area" value={filters.area} onChange={(e) => setFilters({ ...filters, area: e.target.value })}>
            <option value="">Tất cả khu vực</option>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label="Loại dịch vụ" htmlFor="type">
          <select id="type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="GROOMING">Spa / grooming</option>
            <option value="VETERINARY">Thú y</option>
            <option value="BOARDING">Lưu trú</option>
          </select>
        </Field>
        <Field label="Giá tối đa (₫)" htmlFor="maxPrice">
          <input id="maxPrice" inputMode="numeric" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <button className="btn" type="submit">
          Tìm kiếm
        </button>
      </form>

      <ErrorBox error={error} />
      {results === null ? (
        <Spinner />
      ) : results.length === 0 ? (
        <Alert kind="info">Không tìm thấy cơ sở phù hợp. Hãy mở rộng khu vực hoặc bỏ bớt bộ lọc.</Alert>
      ) : (
        <>
          <div className="row between">
            <p className="muted" data-testid="result-count">
              {results.length} cơ sở
            </p>
            <label className="sort">
              Sắp xếp{' '}
              <select aria-label="Sắp xếp" value={filters.sort} onChange={(e) => sortBy(e.target.value)}>
                <option value="name">Tên</option>
                <option value="priceAsc">Giá thấp đến cao</option>
                <option value="priceDesc">Giá cao đến thấp</option>
              </select>
            </label>
          </div>
          <div className="stack">
            {results.map((f) => (
              <article key={f.id} className="card facility-card">
                <h2>
                  <Link to={`/facilities/${f.id}`}>{f.name}</Link>
                </h2>
                <p className="muted">{f.address}</p>
                <p>
                  {f.serviceTypes.map((t) => (
                    <span className="chip" key={t}>
                      {TYPE_LABEL[t]}
                    </span>
                  ))}
                </p>
                <p className="muted">{f.serviceNames.join(' · ')}</p>
                <div className="row between">
                  <span>
                    Giá từ <strong>{formatMoney(f.startingPrice)}</strong>
                  </span>
                  <span className="muted">{f.averageRating ? `★ ${f.averageRating}` : 'Chưa có đánh giá'}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** UC06 step 6 (details) and UC07 Book appointment (with UC08 Check availability). */
export function FacilityDetailPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [detail, setDetail] = useState<FacilityDetail | null>(null);
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [serviceId, setServiceId] = useState(params.get('service') ?? '');
  const [petId, setPetId] = useState('');
  const [date, setDate] = useState(params.get('date') ?? today());
  const [staffId, setStaffId] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [slot, setSlot] = useState<FreeSlot | null>(null);
  const [wantedTime] = useState(params.get('time'));
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string>('');
  const [booked, setBooked] = useState<BookingView | null>(null);
  const [busy, setBusy] = useState(false);
  const availabilityRequest = useRef(0);
  const restoreWantedTime = useRef(true);

  useEffect(() => {
    get<FacilityDetail>(`/facilities/${id}`).then(setDetail).catch(setError);
  }, [id]);

  const isOwner = user?.role === 'PET_OWNER';
  useEffect(() => {
    if (!isOwner) {
      setPets(null);
      return;
    }
    get<Pet[]>('/pets')
      .then((p) => {
        setPets(p);
        if (p.length) setPetId((cur) => cur || p[0]!.id);
      })
      .catch(() => setPets([]));
  }, [isOwner]);

  const bookable = useMemo(() => detail?.services.filter((s) => s.type !== 'BOARDING') ?? [], [detail]);

  function loadSlots(forService = serviceId, forDate = date, keepNotice = false) {
    const request = ++availabilityRequest.current;
    if (!forService || !forDate) return Promise.resolve();
    if (!keepNotice) setNotice('');
    return get<Availability>(`/facilities/${id}/availability?serviceId=${forService}&date=${forDate}`)
      .then((a) => {
        if (request !== availabilityRequest.current) return;
        setAvailability(a);
        setError(null);
        const wanted = restoreWantedTime.current && wantedTime && a.slots.find((s) => s.start === wantedTime);
        restoreWantedTime.current = false;
        setSlot((cur) => {
          const keep = cur && a.slots.find((s) => s.start === cur.start);
          if (keep) return keep;
          return wanted || null;
        });
      })
      .catch((e) => {
        if (request !== availabilityRequest.current) return;
        setAvailability(null);
        setError(e);
      });
  }
  useEffect(() => {
    setBooked(null);
    setSlot(null);
    setAvailability(null);
    setStaffId('');
    loadSlots();
    return () => { ++availabilityRequest.current; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, serviceId, date]);

  const service: Service | undefined = bookable.find((s) => s.id === serviceId);
  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    availability?.slots.forEach((s) => s.staff.forEach((m) => map.set(m.id, m.name)));
    return [...map.entries()];
  }, [availability]);
  const visibleSlots = availability?.slots.filter((s) => !staffId || s.staff.some((m) => m.id === staffId)) ?? [];
  const pet = pets?.find((p) => p.id === petId);
  const chosenStaff = slot ? slot.staff.find((m) => m.id === staffId) ?? slot.staff[0] : undefined;

  async function confirm() {
    if (!slot || !service || !pet || availability?.date !== date || availability.serviceId !== serviceId) return;
    if (staffId && !slot.staff.some((member) => member.id === staffId)) return;
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      const b = await post<BookingView>('/bookings', { petId: pet.id, serviceId: service.id, date, time: slot.start, ...(staffId ? { staffId } : {}) });
      setBooked(b);
      setSlot(null);
      await loadSlots(service.id, date, true);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SLOT_TAKEN') {
        // UC07 A1: the slot was taken in the meantime; the updated slots are shown.
        setNotice(e.message);
        setSlot(null);
        const slots = (e.details.slots as FreeSlot[] | undefined) ?? [];
        setAvailability((a) => (a ? { ...a, slots } : a));
      } else {
        setError(e);
      }
    } finally {
      setBusy(false);
    }
  }

  if (error && !detail) return <ErrorBox error={error} />;
  if (!detail) return <Spinner />;
  const f = detail.facility;
  const loginLink = `/login?next=${encodeURIComponent(`/facilities/${id}?service=${serviceId}&date=${date}${slot ? `&time=${slot.start}` : ''}`)}`;

  return (
    <>
      <PageTitle title={f.name} />
      <section className="card">
        <p>{f.description}</p>
        <dl className="facts">
          <dt>Địa chỉ</dt>
          <dd>{f.address}</dd>
          <dt>Giờ mở cửa</dt>
          <dd>{f.openingHours}</dd>
          <dt>Điện thoại</dt>
          <dd>{f.phone}</dd>
          <dt>Đánh giá</dt>
          <dd>{detail.averageRating ? `★ ${detail.averageRating}` : 'Chưa có đánh giá'}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>Dịch vụ và bảng giá</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Dịch vụ</th>
              <th>Loại</th>
              <th>Thời gian</th>
              <th>Giá</th>
            </tr>
          </thead>
          <tbody>
            {detail.services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{TYPE_LABEL[s.type]}</td>
                <td>{s.durationMinutes ? `${s.durationMinutes} phút` : 'Theo đêm'}</td>
                <td>{formatMoney(s.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {detail.staff.length > 0 && <p className="muted">Nhân viên: {detail.staff.map((s) => s.name).join(', ')}</p>}
      </section>

      <section className="card" aria-labelledby="booking-title">
        <h2 id="booking-title">Đặt lịch</h2>
        {bookable.length === 0 ? (
          <Alert kind="info">Cơ sở này chỉ có dịch vụ lưu trú theo đêm; đặt phòng lưu trú sẽ có ở phiên bản sau.</Alert>
        ) : (
          <>
            {booked && (
              <div data-testid="booking-success">
                <Alert kind="success">
                  Đặt lịch thành công: {booked.pet.name} – {booked.service.name}, {booked.startTime} ngày {formatDate(booked.date)}, nhân viên {booked.staff.name}.{' '}
                  <Link to="/bookings">Xem lịch hẹn của tôi</Link>
                </Alert>
              </div>
            )}
            {notice && <Alert kind="warning">{notice}</Alert>}
            <ErrorBox error={error} />

            <fieldset>
              <legend>1. Chọn dịch vụ</legend>
              {bookable.map((s) => (
                <label className="radio" key={s.id}>
                  <input type="radio" name="service" value={s.id} checked={serviceId === s.id} onChange={() => setServiceId(s.id)} /> {s.name} – {s.durationMinutes} phút – {formatMoney(s.price)}
                </label>
              ))}
            </fieldset>

            {isOwner && pets !== null && pets.length === 0 ? (
              <Alert kind="info">
                Bạn chưa có hồ sơ thú cưng. <Link to="/pets/new">Tạo hồ sơ thú cưng</Link> rồi quay lại đặt lịch.
              </Alert>
            ) : (
              isOwner && (
                <Field label="2. Chọn thú cưng" htmlFor="petId">
                  <select id="petId" value={petId} onChange={(e) => setPetId(e.target.value)}>
                    {pets?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.species})
                      </option>
                    ))}
                  </select>
                </Field>
              )
            )}

            <div className="inline-form">
              <Field label="3. Chọn ngày" htmlFor="date">
                <input id="date" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Nhân viên (không bắt buộc)" htmlFor="staffId">
                <select id="staffId" value={staffId} onChange={(e) => { setStaffId(e.target.value); setSlot(null); }}>
                  <option value="">Bất kỳ</option>
                  {staffOptions.map(([sid, name]) => (
                    <option key={sid} value={sid}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {serviceId && availability && (
              <div aria-live="polite">
                <h3>
                  4. Chọn khung giờ – {weekdayLabel(date)}, {formatDate(date)}
                </h3>
                {visibleSlots.length === 0 ? (
                  <Alert kind="info">
                    <span data-testid="no-slots">Không còn khung giờ trống trong ngày này.</span>{' '}
                    {availability.nearestDates.length > 0 && (
                      <>
                        Các ngày gần nhất còn chỗ:{' '}
                        {availability.nearestDates.map((d) => (
                          <button key={d} className="btn btn-light btn-small" onClick={() => setDate(d)}>
                            {weekdayLabel(d)} {formatDate(d)}
                          </button>
                        ))}
                      </>
                    )}
                  </Alert>
                ) : (
                  <div className="slots">
                    {visibleSlots.map((s) => (
                      <button
                        key={s.start}
                        type="button"
                        className={`slot${slot?.start === s.start ? ' selected' : ''}`}
                        data-testid={`slot-${s.start}`}
                        aria-pressed={slot?.start === s.start}
                        title={s.staff.map((m) => m.name).join(', ')}
                        onClick={() => setSlot(s)}
                      >
                        {s.start} – {s.end}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {slot && service && (
              <div className="summary" data-testid="booking-summary">
                <h3>5. Xác nhận đặt lịch</h3>
                <dl className="facts">
                  <dt>Cơ sở</dt>
                  <dd>{f.name}</dd>
                  <dt>Dịch vụ</dt>
                  <dd>{service.name}</dd>
                  <dt>Thú cưng</dt>
                  <dd>{pet ? pet.name : '—'}</dd>
                  <dt>Thời gian</dt>
                  <dd>
                    {slot.start} – {slot.end}, {formatDate(date)}
                  </dd>
                  <dt>Nhân viên</dt>
                  <dd>{chosenStaff?.name}{staffId ? '' : ' (sắp xếp tự động)'}</dd>
                  <dt>Giá</dt>
                  <dd>
                    <strong>{formatMoney(service.price)}</strong>
                  </dd>
                </dl>
                {!user ? (
                  <Alert kind="info">
                    Bạn cần đăng nhập để đặt lịch. <Link to={loginLink}>Đăng nhập</Link> – sau đó bạn sẽ quay lại bước này.
                  </Alert>
                ) : (
                  <div className="actions">
                    <button className="btn" onClick={confirm} disabled={busy || !pet}>
                      {busy ? 'Đang đặt…' : 'Xác nhận đặt lịch'}
                    </button>
                    <button className="btn btn-light" onClick={() => setSlot(null)}>
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
