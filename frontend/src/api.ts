/** Client of the REST API (HTTPS, REST/JSON). Cookies carry the server-side session. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng và thử lại.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const e = json?.error;
    // A protected request without a valid session (for example after 30 minutes idle, UC02 A4): the user must log in again.
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new CustomEvent('auth:unauthenticated', { detail: e?.code }));
    throw new ApiError(res.status, e?.code ?? 'ERROR', e?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.', e?.fields ?? {}, e?.details ?? {});
  }
  return json.data as T;
}

export const get = <T,>(path: string) => api<T>('GET', path);
export const post = <T,>(path: string, body?: unknown) => api<T>('POST', path, body ?? {});
export const put = <T,>(path: string, body: unknown) => api<T>('PUT', path, body);

// ---------------------------------------------------------------------------------------- types
export type Role = 'PET_OWNER' | 'STAFF' | 'FACILITY_OWNER' | 'SYSTEM_ADMINISTRATOR';
export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
}
export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  birthDate: string | null;
  microchipNumber: string | null;
  allergies: string[];
  qrCode: string;
  status: 'ACTIVE' | 'ARCHIVED';
}
export interface WeightRecord {
  id: string;
  weightKg: number;
  recordedAt: string;
}
export interface VaccinationRecord {
  id: string;
  vaccineName: string;
  injectionDate: string;
  revaccinationDate: string | null;
}
export interface FacilitySummary {
  id: string;
  name: string;
  area: string;
  address: string;
  serviceTypes: string[];
  serviceNames: string[];
  startingPrice: number;
  averageRating: number | null;
}
export interface Service {
  id: string;
  name: string;
  type: 'GROOMING' | 'VETERINARY' | 'BOARDING';
  durationMinutes: number | null;
  price: number;
  description: string;
}
export interface FacilityDetail {
  facility: { id: string; name: string; area: string; address: string; phone: string; description: string; openingHours: string };
  services: Service[];
  staff: { id: string; name: string; position: string }[];
  averageRating: number | null;
}
export interface FreeSlot {
  start: string;
  end: string;
  startAt: string;
  staff: { id: string; name: string }[];
}
export interface Availability {
  date: string;
  slots: FreeSlot[];
  nearestDates: string[];
  durationMinutes: number;
}
export interface BookingView {
  id: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  facility: { id: string; name: string; address: string; phone: string };
  service: { id: string; name: string; type: string };
  pet: { id: string; name: string; allergies: string[] };
  staff: { id: string; name: string };
  canCancel: boolean;
  cancellationReason: string | null;
}
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
