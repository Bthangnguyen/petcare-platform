import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { get } from '../api';
import { useAuth } from '../auth';

const ROLE_LABEL: Record<string, string> = {
  PET_OWNER: 'Chủ thú cưng',
  FACILITY_OWNER: 'Chủ cơ sở',
  STAFF: 'Nhân viên',
  SYSTEM_ADMINISTRATOR: 'Quản trị viên',
};

/** Page frame: header with the menu of the role, the notification bell and the user menu. */
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // The unread count is polled every 30 seconds (UC25); no WebSocket is used.
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let alive = true;
    const load = () =>
      get<{ unread: number }>('/notifications/unread-count')
        .then((r) => alive && setUnread(r.unread))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user]);

  const link = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="Pet Care Platform – trang chủ">
            <span aria-hidden="true">🐾</span> Pet Care Platform
          </Link>
          <nav aria-label="Menu chính" className="nav">
            <NavLink to="/facilities" className={link}>
              Tìm cơ sở
            </NavLink>
            {user?.role === 'PET_OWNER' && (
              <>
                <NavLink to="/pets" className={link}>
                  Thú cưng
                </NavLink>
                <NavLink to="/bookings" className={link}>
                  Lịch hẹn
                </NavLink>
                <NavLink to="/reminders" className={link}>
                  Nhắc lịch
                </NavLink>
              </>
            )}
            {user?.role === 'FACILITY_OWNER' && (
              <>
                <NavLink to="/facility/bookings" className={link}>
                  Lịch hẹn của cơ sở
                </NavLink>
                <NavLink to="/facility/applications" className={link}>
                  Đăng ký cơ sở
                </NavLink>
                <NavLink to="/facility/services" className={link}>
                  Dịch vụ
                </NavLink>
                <NavLink to="/facility/staff" className={link}>
                  Nhân viên
                </NavLink>
              </>
            )}
            {user?.role === 'STAFF' && (
              <NavLink to="/staff" className={link}>
                Công việc
              </NavLink>
            )}
            {user?.role === 'SYSTEM_ADMINISTRATOR' && (
              <NavLink to="/admin/facilities" className={link}>
                Duyệt cơ sở
              </NavLink>
            )}
          </nav>
          <div className="user-area">
            {user ? (
              <>
                <NavLink to="/notifications" className="bell" aria-label={`Thông báo, ${unread} chưa đọc`}>
                  <span aria-hidden="true">🔔</span>
                  {unread > 0 && <span className="badge" data-testid="unread-badge">{unread}</span>}
                </NavLink>
                <span className="user-name" title={ROLE_LABEL[user.role]}>
                  {user.fullName}
                </span>
                <button
                  className="btn btn-light"
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-light">
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <footer className="footer">Pet Care Platform – Nhóm 12, môn Nhập môn Công nghệ phần mềm (HCMUS). Dữ liệu trong ứng dụng là dữ liệu giả lập.</footer>
    </>
  );
}
