export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email is not configured.");
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailSendError extends Error {
  readonly code: string;

  constructor(code: string) {
    super("The email provider rejected the message.");
    this.name = "EmailSendError";
    this.code = code;
  }
}
