/** Formatting for the Vietnamese user interface (NFR-03): dd/mm/yyyy, prices in VND. */
export const formatDate = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

export const formatMoney = (n: number): string => `${n.toLocaleString('vi-VN')} ₫`;

/** Local date of today (YYYY-MM-DD) in the time zone of the browser. */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const TYPE_LABEL: Record<string, string> = { GROOMING: 'Spa / grooming', VETERINARY: 'Thú y', BOARDING: 'Lưu trú' };

export const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã check-in',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  NO_SHOW: 'Vắng mặt',
  CANCELLED: 'Đã hủy',
};

export const WEEKDAY = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export function weekdayLabel(iso: string): string {
  return WEEKDAY[new Date(`${iso}T00:00:00`).getDay()] ?? '';
}
