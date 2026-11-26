import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, get, post } from '../api';
import { Alert, ErrorBox, Field } from '../components/ui';

const apiPath = '/auth/password-reset';
const invalidLinkMessage = 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.';
type Message = { message: string };

/** UC24 — owner: Quỳnh. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFieldError(undefined);
    setError(undefined);
    setMessage(undefined);
    setBusy(true);
    try {
      setMessage((await post<Message>(`${apiPath}/request`, { email: email.trim() })).message);
    } catch (err) {
      if (err instanceof ApiError && err.fields.email) setFieldError(err.fields.email);
      else setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>Quên mật khẩu</h1>
      <p>Nhập e-mail đã đăng ký để yêu cầu liên kết đặt lại mật khẩu.</p>
      <ErrorBox error={error} />
      {message && <Alert kind="success">{message}</Alert>}
      <form onSubmit={submit} noValidate aria-busy={busy}>
        <Field label="E-mail" htmlFor="reset-email" error={fieldError}>
          <input id="reset-email" type="email" autoComplete="email" required value={email}
            onChange={(event) => setEmail(event.target.value)} aria-invalid={!!fieldError}
            aria-describedby={fieldError ? 'reset-email-error' : undefined} />
        </Field>
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
        </button>
      </form>
      <p className="muted center"><Link to="/login">Quay lại đăng nhập</Link></p>
    </div>
  );
}

type LinkCheck = { status: 'checking' | 'valid' | 'invalid' } | { status: 'error'; error: unknown };

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  return <ResetPasswordForm key={token} token={token} />;
}

function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const [check, setCheck] = useState<LinkCheck>({ status: token ? 'checking' : 'invalid' });
  const [retryCount, setRetryCount] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let current = true;
    get<{ valid: boolean }>(`${apiPath}/validate?${new URLSearchParams({ token })}`)
      .then(() => { if (current) setCheck({ status: 'valid' }); })
      .catch((err) => {
        if (!current) return;
        if (err instanceof ApiError && err.code === 'RESET_TOKEN_INVALID') setCheck({ status: 'invalid' });
        else setCheck({ status: 'error', error: err });
      });
    return () => { current = false; };
  }, [token, retryCount]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => navigate('/login', { replace: true }), 4000);
    return () => window.clearTimeout(id);
  }, [message, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || check.status !== 'valid') return;
    setFields({});
    setError(undefined);
    setBusy(true);
    try {
      const result = await post<Message>(`${apiPath}/confirm`, { token, password, passwordConfirmation: confirmation });
      setPassword('');
      setConfirmation('');
      setMessage(result.message);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESET_TOKEN_INVALID') {
        setPassword('');
        setConfirmation('');
        setCheck({ status: 'invalid' });
      } else if (err instanceof ApiError && Object.keys(err.fields).length) {
        setFields(err.fields);
      } else setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>Đặt lại mật khẩu</h1>
      {message ? (
        <>
          <Alert kind="success">{message}</Alert>
          <Link className="btn" to="/login" replace>Đi đến đăng nhập</Link>
        </>
      ) : check.status === 'checking' ? (
        <p role="status">Đang kiểm tra liên kết…</p>
      ) : check.status === 'invalid' ? (
        <>
          <Alert>{invalidLinkMessage}</Alert>
          <Link className="btn" to="/forgot-password" replace>Yêu cầu liên kết mới</Link>
        </>
      ) : check.status === 'error' ? (
        <>
          <ErrorBox error={check.error} />
          <button type="button" className="btn" onClick={() => {
            setCheck({ status: 'checking' });
            setRetryCount((value) => value + 1);
          }}>Thử lại</button>
        </>
      ) : (
        <>
          <ErrorBox error={error} />
          <form onSubmit={submit} noValidate aria-busy={busy}>
            <Field label="Mật khẩu mới" htmlFor="reset-password" error={fields.password} hint="Ít nhất 8 ký tự.">
              <input id="reset-password" type="password" autoComplete="new-password" required value={password}
                onChange={(event) => setPassword(event.target.value)} aria-invalid={!!fields.password}
                aria-describedby={fields.password ? 'reset-password-error' : undefined} />
            </Field>
            <Field label="Nhập lại mật khẩu mới" htmlFor="reset-confirmation" error={fields.passwordConfirmation}>
              <input id="reset-confirmation" type="password" autoComplete="new-password" required value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)} aria-invalid={!!fields.passwordConfirmation}
                aria-describedby={fields.passwordConfirmation ? 'reset-confirmation-error' : undefined} />
            </Field>
            <button className="btn btn-block" type="submit" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
