// Thrown by input parsers; the route layer turns it into a 400 VALIDATION_ERROR.
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

// Input is well-formed but breaks a business rule (e.g. paying more than is
// owed); the route layer turns it into a 422 with this code.
export class BusinessRuleError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "BusinessRuleError";
    this.code = code;
    this.details = details;
  }
}
