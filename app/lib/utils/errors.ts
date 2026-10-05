
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}


export class TimelineOrderError extends Error {
  readonly field: "intakeDate" | "outcomeDate";

  constructor(message: string, field: "intakeDate" | "outcomeDate") {
    super(message);
    this.name = "TimelineOrderError";
    this.field = field;
  }
}


export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}


export class PreconditionFailedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PreconditionFailedError";
    }
  }


export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}


export class UnauthenticatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthenticatedError";
  }
}
