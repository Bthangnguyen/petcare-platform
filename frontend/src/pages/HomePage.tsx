import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { get, type BookingView, type Pet } from '../api';
import { useAuth } from '../auth';
import { PageTitle, Spinner } from '../components/ui';
import { formatDate } from '../format';

/** Main screen. Visitor: introduction. Pet owner: pets, next appointments and shortcuts. Facility owner: the bookings of the facility. */
export default function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Visitor />;
  if (user.role === 'FACILITY_OWNER') return <Navigate to="/facility/bookings" replace />;
  if (user.role === 'STAFF') return <Navigate to="/staff" replace />;
  if (user.role === 'SYSTEM_ADMINISTRATOR') return <Navigate to="/admin" replace />;
  if (user.role === 'PET_OWNER') return <OwnerHome name={user.fullName} />;
  return (
    <div className="card">
      <h1>Xin chào, {user.fullName}</h1>
      <p>Chức năng của vai trò này sẽ có ở phiên bản sau.</p>
    </div>
  );
}

function Visitor() {
  return (
    <section className="hero">
      <h1>Chăm sóc thú cưng dễ dàng hơn</h1>
      <p>Tìm spa, phòng khám thú y và khách sạn thú cưng gần bạn, xem lịch trống và đặt lịch chỉ trong vài bước. Quản lý hồ sơ sức khỏe của thú cưng với mã QR.</p>
      <div className="hero-actions">
        <Link className="btn" to="/facilities">
          Tìm cơ sở
        </Link>
        <Link className="btn btn-light" to="/register">
          Đăng ký miễn phí
        </Link>
        <Link className="btn btn-light" to="/login">
          Đăng nhập
        </Link>
      </div>
    </section>
  );
}

function OwnerHome({ name }: { name: string }) {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [upcoming, setUpcoming] = useState<BookingView[] | null>(null);

  useEffect(() => {
    get<Pet[]>('/pets').then(setPets).catch(() => setPets([]));
    get<{ upcoming: BookingView[] }>('/bookings/mine')
      .then((r) => setUpcoming(r.upcoming))
      .catch(() => setUpcoming([]));
  }, []);

  return (
    <>
      <PageTitle title={`Xin chào, ${name}`} />
      <div className="quick-actions">
        <Link className="tile" to="/facilities">
          <span aria-hidden="true">🔍</span> Tìm cơ sở và đặt lịch
        </Link>
        <Link className="tile" to="/pets/new">
          <span aria-hidden="true">➕</span> Thêm thú cưng
        </Link>
        <Link className="tile" to="/bookings">
          <span aria-hidden="true">📅</span> Lịch hẹn của tôi
        </Link>
      </div>

      <section className="card">
        <h2>Lịch hẹn sắp tới</h2>
        {upcoming === null ? (
          <Spinner />
        ) : upcoming.length === 0 ? (
          <p className="muted">
            Bạn chưa có lịch hẹn sắp tới. <Link to="/facilities">Tìm cơ sở để đặt lịch</Link>
          </p>
        ) : (
          <ul className="list">
            {upcoming.slice(0, 3).map((b) => (
              <li key={b.id}>
                <strong>{b.pet.name}</strong> – {b.service.name} tại {b.facility.name}
                <div className="muted">
                  {b.startTime} ngày {formatDate(b.date)} · {b.staff.name}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Thú cưng của tôi</h2>
        {pets === null ? (
          <Spinner />
        ) : pets.length === 0 ? (
          <p className="muted">
            Bạn chưa có hồ sơ thú cưng nào. <Link to="/pets/new">Tạo hồ sơ đầu tiên</Link>
          </p>
        ) : (
          <div className="pet-grid">
            {pets.map((p) => (
              <Link key={p.id} to={`/pets/${p.id}`} className="pet-card">
                <span className="pet-icon" aria-hidden="true">
                  {p.species === 'Mèo' ? '🐱' : p.species === 'Chó' ? '🐶' : '🐾'}
                </span>
                <strong>{p.name}</strong>
                <span className="muted">
                  {p.species}
                  {p.breed ? ` · ${p.breed}` : ''}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
