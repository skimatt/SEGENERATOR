export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: unknown = null) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class DataConflictError extends AppError {
  constructor(message: string, details: unknown = null) {
    super('DATA_CONFLICT', message, 409, details);
  }
}

export class TemplateError extends AppError {
  constructor(message: string, details: unknown = null) {
    super('TEMPLATE_ERROR', message, 422, details);
  }
}

export class GoogleSheetsError extends AppError {
  constructor(message: string, details: unknown = null) {
    super('GOOGLE_SHEETS_ERROR', message, 502, details);
  }
}

export class ReportGenerationError extends AppError {
  constructor(message: string, details: unknown = null) {
    super('REPORT_GENERATION_ERROR', message, 500, details);
  }
}
