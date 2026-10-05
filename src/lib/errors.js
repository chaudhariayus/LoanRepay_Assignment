// Thrown by input parsers; the route layer turns it into a 400 VALIDATION_ERROR.
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}
