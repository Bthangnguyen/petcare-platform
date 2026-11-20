import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, get, post, put, type Pet, type VaccinationRecord, type WeightRecord } from '../api';
import { Alert, ErrorBox, Field, PageTitle, Spinner } from '../components/ui';
import { formatDate, today } from '../format';

/** UC03 "My pets": list of pets with the actions view, edit and archive. */
export function PetsPage() {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => get<Pet[]>('/pets').then(setPets).catch(setError);
  useEffect(() => {
    load();
  }, []);

  async function archive(id: string) {
    try {
      await post(`/pets/${id}/archive`);
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e);
    }
  }

  return (
    <>
      <PageTitle title="Thú cưng của tôi">
        <Link className="btn" to="/pets/new">
          Thêm thú cưng
        </Link>
      </PageTitle>
      <ErrorBox error={error} />
      {pets === null ? (
        <Spinner />
      ) : pets.length === 0 ? (
        <div className="card">
          <p>Bạn chưa có hồ sơ thú cưng nào. Hãy tạo hồ sơ để đặt lịch và theo dõi sức khỏe.</p>
          <Link className="btn" to="/pets/new">
            Tạo hồ sơ thú cưng
          </Link>
        </div>
      ) : (
        <div className="stack">
          {pets.map((p) => (
            <article className="card row" key={p.id}>
              <div className="grow">
                <h2>
                  <Link to={`/pets/${p.id}`}>{p.name}</Link>
                </h2>
                <p className="muted">
                  {p.species}
                  {p.breed ? ` · ${p.breed}` : ''}
                  {p.sex ? ` · ${p.sex}` : ''}
                  {p.birthDate ? ` · sinh ${formatDate(p.birthDate)}` : ''}
                </p>
              </div>
              <div className="actions">
                <Link className="btn btn-light" to={`/pets/${p.id}`}>
                  Xem
                </Link>
                <Link className="btn btn-light" to={`/pets/${p.id}/edit`}>
                  Sửa
                </Link>
                {confirmId === p.id ? (
                  <>
                    <span className="muted">Lưu trữ hồ sơ này?</span>
                    <button className="btn btn-danger" onClick={() => archive(p.id)}>
                      Xác nhận
                    </button>
                    <button className="btn btn-light" onClick={() => setConfirmId(null)}>
                      Không
                    </button>
                  </>
                ) : (
                  <button className="btn btn-light" onClick={() => setConfirmId(p.id)}>
                    Lưu trữ
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/** UC03 pet form (add and edit). */
export function PetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', species: 'Chó', breed: '', sex: '', birthDate: '', microchipNumber: '', allergies: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (!id) return;
    get<{ pet: Pet }>(`/pets/${id}`)
      .then(({ pet }) =>
        setForm({
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          sex: pet.sex,
          birthDate: pet.birthDate ?? '',
          microchipNumber: pet.microchipNumber ?? '',
          allergies: pet.allergies.join(', '),
        }),
      )
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setError(null);
    const body = {
      name: form.name,
      species: form.species,
      breed: form.breed,
      sex: form.sex,
      birthDate: form.birthDate || null,
      microchipNumber: form.microchipNumber || null,
      allergies: form.allergies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setBusy(true);
    try {
      const pet = id ? await put<Pet>(`/pets/${id}`, body) : await post<Pet>('/pets', body);
      navigate(`/pets/${pet.id}`);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  return (
    <div className="card narrow">
      <h1>{id ? 'Sửa hồ sơ thú cưng' : 'Thêm thú cưng'}</h1>
      <ErrorBox error={error} />
      <form onSubmit={submit} noValidate>
        <Field label="Tên thú cưng *" htmlFor="name" error={errors.name}>
          <input id="name" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Loài *" htmlFor="species" error={errors.species}>
          <select id="species" value={form.species} onChange={set('species')}>
            <option>Chó</option>
            <option>Mèo</option>
            <option>Khác</option>
          </select>
        </Field>
        <Field label="Giống" htmlFor="breed" error={errors.breed}>
          <input id="breed" value={form.breed} onChange={set('breed')} />
        </Field>
        <Field label="Giới tính" htmlFor="sex" error={errors.sex}>
          <select id="sex" value={form.sex} onChange={set('sex')}>
            <option value="">Chưa rõ</option>
            <option>Đực</option>
            <option>Cái</option>
          </select>
        </Field>
        <Field label="Ngày sinh" htmlFor="birthDate" error={errors.birthDate}>
          <input id="birthDate" type="date" max={today()} value={form.birthDate} onChange={set('birthDate')} />
        </Field>
        <Field label="Số microchip" htmlFor="microchipNumber" error={errors.microchipNumber} hint="15 chữ số, nếu có.">
          <input id="microchipNumber" inputMode="numeric" value={form.microchipNumber} onChange={set('microchipNumber')} />
        </Field>
        <Field label="Dị ứng" htmlFor="allergies" error={errors.allergies} hint="Ngăn cách bằng dấu phẩy, ví dụ: thịt gà, hải sản.">
          <input id="allergies" value={form.allergies} onChange={set('allergies')} />
        </Field>
        <div className="actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
          <Link className="btn btn-light" to={id ? `/pets/${id}` : '/pets'}>
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
}

/** Pet profile with QR code, weight history and vaccination records (UC03, view of UC04). */
export function PetDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<{ pet: Pet; weights: WeightRecord[]; vaccinations: VaccinationRecord[] } | null>(null);
  const [qr, setQr] = useState<string>('');
  const [error, setError] = useState<unknown>(null);

  const load = () =>
    get<{ pet: Pet; weights: WeightRecord[]; vaccinations: VaccinationRecord[] }>(`/pets/${id}`)
      .then(setData)
      .catch(setError);
  useEffect(() => {
    load();
    get<{ dataUrl: string }>(`/pets/${id}/qr`)
      .then((r) => setQr(r.dataUrl))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  const { pet, weights, vaccinations } = data;

  return (
    <>
      <PageTitle title={pet.name}>
        <Link className="btn btn-light" to={`/pets/${pet.id}/edit`}>
          Sửa hồ sơ
        </Link>
        <Link className="btn" to="/facilities">
          Đặt lịch
        </Link>
      </PageTitle>
      {pet.status === 'ARCHIVED' && <Alert kind="warning">Hồ sơ này đã được lưu trữ.</Alert>}
      <div className="grid-2">
        <section className="card">
          <h2>Thông tin chung</h2>
          <dl className="facts">
            <dt>Loài</dt>
            <dd>{pet.species}</dd>
            <dt>Giống</dt>
            <dd>{pet.breed || '—'}</dd>
            <dt>Giới tính</dt>
            <dd>{pet.sex || '—'}</dd>
            <dt>Ngày sinh</dt>
            <dd>{formatDate(pet.birthDate)}</dd>
            <dt>Microchip</dt>
            <dd>{pet.microchipNumber ?? '—'}</dd>
            <dt>Dị ứng</dt>
            <dd>{pet.allergies.length ? pet.allergies.join(', ') : 'Không có'}</dd>
          </dl>
        </section>
        <section className="card center">
          <h2>Mã QR của thú cưng</h2>
          {qr ? <img src={qr} alt={`Mã QR của ${pet.name}`} width={180} height={180} /> : <Spinner />}
          <p className="muted">Nhân viên cơ sở quét mã này để mở hồ sơ (cần có lịch hẹn tại cơ sở).</p>
        </section>
      </div>
      <WeightSection petId={pet.id} weights={weights} onChanged={load} />
      <VaccinationSection petId={pet.id} items={vaccinations} onChanged={load} />
    </>
  );
}

function WeightSection({ petId, weights, onChanged }: { petId: string; weights: WeightRecord[]; onChanged: () => void }) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setError(null);
    const kg = Number(weight.replace(',', '.'));
    if (!weight.trim() || Number.isNaN(kg)) {
      setErrors({ weightKg: 'Cân nặng phải là số.' });
      return;
    }
    try {
      await post(`/pets/${petId}/weights`, { weightKg: kg, recordedAt: date });
      setWeight('');
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(err);
    }
  }

  return (
    <section className="card">
      <h2>Cân nặng</h2>
      {weights.length > 1 && <WeightChart weights={weights} />}
      {weights.length === 0 ? (
        <p className="muted">Chưa có lần cân nào.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Cân nặng</th>
            </tr>
          </thead>
          <tbody>
            {weights.map((w) => (
              <tr key={w.id}>
                <td>{formatDate(w.recordedAt)}</td>
                <td>{w.weightKg} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ErrorBox error={error && Object.keys(errors).length === 0 ? error : null} />
      <form className="inline-form" onSubmit={submit} noValidate>
        <Field label="Cân nặng (kg)" htmlFor="weightKg" error={errors.weightKg}>
          <input id="weightKg" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
        <Field label="Ngày cân" htmlFor="recordedAt" error={errors.recordedAt}>
          <input id="recordedAt" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <button className="btn" type="submit">
          Thêm cân nặng
        </button>
      </form>
    </section>
  );
}

function WeightChart({ weights }: { weights: WeightRecord[] }) {
  const w = 320;
  const h = 90;
  const min = Math.min(...weights.map((x) => x.weightKg));
  const max = Math.max(...weights.map((x) => x.weightKg));
  const span = max - min || 1;
  const pts = weights.map((x, i) => `${10 + (i * (w - 20)) / (weights.length - 1)},${h - 12 - ((x.weightKg - min) / span) * (h - 24)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: 360 }} role="img" aria-label="Biểu đồ cân nặng theo thời gian">
      <polyline points={pts.join(' ')} fill="none" stroke="#0f766e" strokeWidth="2.5" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.split(',')[0]} cy={p.split(',')[1]} r="3.5" fill="#0f766e" />
      ))}
    </svg>
  );
}

function VaccinationSection({ petId, items, onChanged }: { petId: string; items: VaccinationRecord[]; onChanged: () => void }) {
  const [form, setForm] = useState({ vaccineName: '', injectionDate: today(), revaccinationDate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setError(null);
    try {
      await post(`/pets/${petId}/vaccinations`, { ...form, revaccinationDate: form.revaccinationDate || null });
      setForm({ vaccineName: '', injectionDate: today(), revaccinationDate: '' });
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(err);
    }
  }

  return (
    <section className="card">
      <h2>Tiêm phòng</h2>
      {items.length === 0 ? (
        <p className="muted">Chưa có bản ghi tiêm phòng.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Vắc-xin</th>
              <th>Ngày tiêm</th>
              <th>Tiêm nhắc</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id}>
                <td>{v.vaccineName}</td>
                <td>{formatDate(v.injectionDate)}</td>
                <td>{formatDate(v.revaccinationDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ErrorBox error={error && Object.keys(errors).length === 0 ? error : null} />
      <form className="inline-form" onSubmit={submit} noValidate>
        <Field label="Tên vắc-xin" htmlFor="vaccineName" error={errors.vaccineName}>
          <input id="vaccineName" value={form.vaccineName} onChange={(e) => setForm({ ...form, vaccineName: e.target.value })} />
        </Field>
        <Field label="Ngày tiêm" htmlFor="injectionDate" error={errors.injectionDate}>
          <input id="injectionDate" type="date" max={today()} value={form.injectionDate} onChange={(e) => setForm({ ...form, injectionDate: e.target.value })} />
        </Field>
        <Field label="Ngày tiêm nhắc" htmlFor="revaccinationDate" error={errors.revaccinationDate}>
          <input id="revaccinationDate" type="date" value={form.revaccinationDate} onChange={(e) => setForm({ ...form, revaccinationDate: e.target.value })} />
        </Field>
        <button className="btn" type="submit">
          Thêm tiêm phòng
        </button>
      </form>
    </section>
  );
}
