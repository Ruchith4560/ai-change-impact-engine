import { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = "statusCode" in err ? err.statusCode : 500;
  const message = err.message || "Internal server error";

  console.error(`[Error] ${req.method} ${req.path} (${statusCode}):`, err);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.NODE_ENV === "development" && {
        stack: err.stack,
        details: "details" in err ? err.details : undefined,
      }),
    },
  });
};
