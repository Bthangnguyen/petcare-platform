import type { ReactNode } from 'react';
import { ApiError } from '../api';

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info' | 'warning'; children: ReactNode }) {
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

/** Shows an API error (message of the server) as an alert. */
export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return <Alert>{error instanceof ApiError ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'}</Alert>;
}

/** Label, control and the error text of one form field (fields with errors are highlighted). */
export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error ? <small className="hint">{hint}</small> : null}
      {error ? (
        <small className="error-text" id={`${htmlFor}-error`}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

export function Spinner({ text = 'Đang tải…' }: { text?: string }) {
  return (
    <p className="muted" role="status">
      {text}
    </p>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      <div className="page-actions">{children}</div>
    </div>
  );
}
