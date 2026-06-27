// Custom error hierarchy. Handlers translate AppError into an HTTP response
// (see AGENTS.md § Coding Standards, rule 2). Never throw a bare Error.

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Invalid input (Zod parse failed, malformed body). */
export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 400;
}

/** Retrieval layer (Azure AI Search) failed or returned nothing usable. */
export class RetrievalError extends AppError {
  readonly code = "RETRIEVAL_ERROR";
  readonly status = 502;
}

/** Completion layer (Azure OpenAI / GPT-4o) failed. */
export class CompletionError extends AppError {
  readonly code = "COMPLETION_ERROR";
  readonly status = 502;
}

/** True for any of our known application errors. */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
