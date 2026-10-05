// Each error class maps to one HTTP status in src/lib/http.js.

// Bad input -> 400 VALIDATION_ERROR. Parsers throw it with just a message;
// the service layer collects those per field into `details`.
export class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

// Missing, malformed, invalid or expired Firebase ID token -> 401.
export class UnauthenticatedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

// Unknown resource -> 404.
export class NotFoundError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "NotFoundError";
    this.code = code;
  }
}

// Request clashes with existing state (e.g. idempotency key reused with a
// different body) -> 409.
export class ConflictError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "ConflictError";
    this.code = code;
    this.details = details;
  }
}

// Input is well-formed but breaks a business rule (e.g. paying more than is
// owed) -> 422 with this code.
export class BusinessRuleError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "BusinessRuleError";
    this.code = code;
    this.details = details;
  }
}
