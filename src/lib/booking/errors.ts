export class BookingNotConfiguredError extends Error {
  constructor(message = "Booking is not configured.") {
    super(message);
    this.name = "BookingNotConfiguredError";
  }
}

export class BookingTimeZoneError extends Error {
  constructor() {
    super("The booking timezone is invalid.");
    this.name = "BookingTimeZoneError";
  }
}

export class InvalidSlotError extends Error {
  constructor() {
    super("The selected booking slot is invalid.");
    this.name = "InvalidSlotError";
  }
}

export class SlotUnavailableError extends Error {
  constructor() {
    super("The selected booking slot is no longer available.");
    this.name = "SlotUnavailableError";
  }
}

export class BookingFailedError extends Error {
  readonly code: string;

  constructor(code: string) {
    super("The booking could not be completed.");
    this.name = "BookingFailedError";
    this.code = code;
  }
}

export class GoogleCalendarError extends Error {
  readonly code: string;

  constructor(code: string) {
    super("The calendar provider returned an error.");
    this.name = "GoogleCalendarError";
    this.code = code;
  }
}
