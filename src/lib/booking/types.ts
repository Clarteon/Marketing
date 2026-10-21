export interface BookingSlot {
  id: string;
  start: string;
  end: string;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface BookingRecord {
  requestId: string;
  slotStart: Date;
  slotEnd: Date;
  name: string;
  email: string;
  notes?: string;
  timezone: string;
  status: "pending" | "confirmed";
  googleEventId?: string;
  meetLink?: string;
  calendarLink?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface NewBooking {
  requestId: string;
  slotStart: Date;
  slotEnd: Date;
  name: string;
  email: string;
  notes?: string;
  timezone: string;
}

export interface CreateCalendarEventInput {
  requestId: string;
  start: Date;
  end: Date;
  name: string;
  email: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  meetLink: string;
  calendarLink?: string;
}

export interface CalendarProvider {
  getBusyIntervals(timeMin: Date, timeMax: Date): Promise<BusyInterval[]>;
  findEventByRequestId(requestId: string, around: Date): Promise<CalendarEvent | undefined>;
  createEvent(input: CreateCalendarEventInput): Promise<CalendarEvent>;
}

export interface Availability {
  timezone: string;
  slots: BookingSlot[];
}

export interface BookingEmailResult {
  visitor: boolean;
  team: boolean;
}
