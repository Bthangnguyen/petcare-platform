/**
 * ReminderPort (SAD, section 4.6): what the other use cases need from the reminders (UC17).
 * UC16 calls createReminder after a result with a next due date; UC03 can call it for a vaccination with a re-vaccination date.
 * Until UC17 is built, app.ts gives the use cases NoopReminders; the owner of UC17 replaces it by the real service.
 */
export type CareType = 'VACCINATION' | 'DEWORMING' | 'CHECKUP' | 'GROOMING';
export type ReminderSource = 'MANUAL' | 'SERVICE_RESULT' | 'AI_EXTRACTION';

export interface CreateReminderInput {
  petId: string;
  ownerId: string;
  careType: CareType;
  /** local date, YYYY-MM-DD */
  dueDate: string;
  title: string;
  source: ReminderSource;
}

export interface ReminderPort {
  createReminder(input: CreateReminderInput): void;
}

/** Placeholder that does nothing (used until UC17 is merged). */
export class NoopReminders implements ReminderPort {
  createReminder(_input: CreateReminderInput): void {
    // intentionally empty
  }
}
