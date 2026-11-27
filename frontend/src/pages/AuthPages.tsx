import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, post } from '../api';
import { useAuth } from '../auth';
import { Alert, ErrorBox, Field } from '../components/ui';

/** UC02 Log in. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const fe: Record<string, string> = {};
    if (!email.trim()) fe.email = 'Vui lòng nhập e-mail.';
    if (!password) fe.password = 'Vui lòng nhập mật khẩu.';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(params.get('next') || '/', { replace: true });
    } catch (err) {
      setError(err);
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>Đăng nhập</h1>
      {params.get('registered') && <Alert kind="success">Đăng ký thành công. Hãy đăng nhập để tiếp tục.</Alert>}
      {params.get('expired') && <Alert kind="warning">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</Alert>}
      {params.get('next') && !params.get('expired') && <Alert kind="info">Bạn cần đăng nhập để tiếp tục.</Alert>}
      <ErrorBox error={error} />
      <form onSubmit={submit} noValidate>
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Mật khẩu" htmlFor="password" error={errors.password}>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
        </Field>
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
      <p className="muted center">
        <Link to="/forgot-password">Quên mật khẩu?</Link>
      </p>
      <p className="muted center">
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
    </div>
  );
}

/** UC01 Register account. */
export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ accountType: 'PET_OWNER', fullName: '', email: '', phone: '', password: '', passwordConfirmation: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});
    setEmailTaken(false);
    setBusy(true);
    try {
      await post('/auth/register', form);
      navigate('/login?registered=1');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (err.code === 'EMAIL_TAKEN') setEmailTaken(true);
      }
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>Đăng ký tài khoản</h1>
      <ErrorBox error={error} />
      {emailTaken && (
        <p>
          <Link to="/login">Đăng nhập bằng e-mail này</Link>
        </p>
      )}
      <form onSubmit={submit} noValidate>
        <fieldset>
          <legend>Loại tài khoản</legend>
          <label className="radio">
            <input type="radio" name="accountType" value="PET_OWNER" checked={form.accountType === 'PET_OWNER'} onChange={set('accountType')} /> Chủ thú cưng
          </label>
          <label className="radio">
            <input type="radio" name="accountType" value="FACILITY_OWNER" checked={form.accountType === 'FACILITY_OWNER'} onChange={set('accountType')} /> Chủ cơ sở
          </label>
        </fieldset>
        <Field label="Họ và tên" htmlFor="fullName" error={errors.fullName}>
          <input id="fullName" value={form.fullName} onChange={set('fullName')} autoComplete="name" />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <input id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Số điện thoại" htmlFor="phone" error={errors.phone}>
          <input id="phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        </Field>
        <Field label="Mật khẩu" htmlFor="password" error={errors.password} hint="Ít nhất 8 ký tự.">
          <input id="password" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <Field label="Nhập lại mật khẩu" htmlFor="passwordConfirmation" error={errors.passwordConfirmation}>
          <input id="passwordConfirmation" type="password" value={form.passwordConfirmation} onChange={set('passwordConfirmation')} autoComplete="new-password" />
        </Field>
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? 'Đang gửi…' : 'Đăng ký'}
        </button>
      </form>
      <p className="muted center">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
}
