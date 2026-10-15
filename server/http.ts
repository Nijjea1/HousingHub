/** Error type, validation helper and error handler shared by every API route. */
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

/** Parses untrusted input or throws a 400 with one message list per field. */
export function parseInput<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const { fieldErrors, formErrors } = result.error.flatten();
    throw new HttpError(400, formErrors[0] ?? "Invalid input", fieldErrors);
  }
  return result.data;
}

// Express 4 does not catch rejected promises, so async handlers pass their errors on explicitly.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, fields: err.fields });
    return;
  }
  // Malformed JSON bodies come from express.json() with a 4xx status already set.
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: err.expose ? err.message : "Bad request" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};
