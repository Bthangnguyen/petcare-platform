import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { FacilityBookingsPage, MyBookingsPage, NotificationsPage } from './pages/BookingPages';
import { FacilitiesPage, FacilityDetailPage } from './pages/FacilityPages';
import HomePage from './pages/HomePage';
import { PetDetailPage, PetFormPage, PetsPage } from './pages/PetPages';
import type { Role } from './api';

/** Pages that need a login: a visitor is sent to the login page and returns afterwards. */
function RequireAuth({ role, children }: { role?: Role; children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) {
    const expired = sessionStorage.getItem('wasLoggedIn') === '1';
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}${expired ? '&expired=1' : ''}`} replace />;
  }
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  // Remember that somebody was logged in, to tell an expired session from a first visit.
  if (user) sessionStorage.setItem('wasLoggedIn', '1');
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="facilities" element={<FacilitiesPage />} />
        <Route path="facilities/:id" element={<FacilityDetailPage />} />
        <Route path="pets" element={<RequireAuth role="PET_OWNER"><PetsPage /></RequireAuth>} />
        <Route path="pets/new" element={<RequireAuth role="PET_OWNER"><PetFormPage /></RequireAuth>} />
        <Route path="pets/:id" element={<RequireAuth role="PET_OWNER"><PetDetailPage /></RequireAuth>} />
        <Route path="pets/:id/edit" element={<RequireAuth role="PET_OWNER"><PetFormPage /></RequireAuth>} />
        <Route path="bookings" element={<RequireAuth role="PET_OWNER"><MyBookingsPage /></RequireAuth>} />
        <Route path="facility/bookings" element={<RequireAuth role="FACILITY_OWNER"><FacilityBookingsPage /></RequireAuth>} />
        <Route path="notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
