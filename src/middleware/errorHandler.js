// src/middleware/errorHandler.js - Global error handler
const { Prisma } = require("@prisma/client");
const logger = require("../utils/logger");

/**
 * Global error handling middleware
 * Provides consistent error responses across the application
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id || "unauthenticated",
  });

  // Default error status and message
  let statusCode = 500;
  let message = "Internal Server Error";
  let details =
    process.env.NODE_ENV === "development" ? err.message : undefined;
  let errorCode = undefined;

  // Handle different types of errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle Prisma specific errors
    switch (err.code) {
      case "P2002": // Unique constraint violation
        statusCode = 409;
        message = "Conflict - Unique constraint violation";
        errorCode = "UNIQUE_CONSTRAINT_VIOLATION";
        details = `A record with the same ${err.meta?.target?.join(", ")} already exists`;
        break;
      case "P2025": // Record not found
        statusCode = 404;
        message = "Not Found - Record does not exist";
        errorCode = "RECORD_NOT_FOUND";
        break;
      case "P2003": // Foreign key constraint violation
        statusCode = 400;
        message = "Bad Request - Foreign key constraint violation";
        errorCode = "FOREIGN_KEY_CONSTRAINT_VIOLATION";
        break;
      default:
        statusCode = 400;
        message = "Database Error";
        errorCode = err.code;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    // Handle Prisma validation errors
    statusCode = 400;
    message = "Bad Request - Validation Error";
    errorCode = "VALIDATION_ERROR";
  } else if (err.name === "ValidationError") {
    // Handle validation errors (e.g., from Joi or express-validator)
    statusCode = 400;
    message = "Bad Request - Validation Error";
    errorCode = "VALIDATION_ERROR";
    details = err.details || err.errors;
  } else if (
    err.name === "UnauthorizedError" ||
    err.name === "TokenExpiredError"
  ) {
    // Handle authentication errors
    statusCode = 401;
    message = "Unauthorized - Invalid or expired token";
    errorCode = "UNAUTHORIZED";
  } else if (err.statusCode) {
    // Use the error's status code if available
    statusCode = err.statusCode;
    message = err.message || message;
    errorCode = err.code || "UNKNOWN_ERROR";
  } else if (err.name === "PaymentRequiredError") {
    // Handle payment related errors
    statusCode = 402;
    message = "Payment Required";
    errorCode = "PAYMENT_REQUIRED";
  } else if (err.name === "ForbiddenError") {
    // Handle permission errors
    statusCode = 403;
    message = "Forbidden - Insufficient permissions";
    errorCode = "FORBIDDEN";
  } else if (err.name === "NotFoundError") {
    // Handle not found errors
    statusCode = 404;
    message = "Not Found";
    errorCode = "NOT_FOUND";
  } else if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
    // Handle connection errors
    statusCode = 503;
    message = "Service Unavailable - Unable to connect to service";
    errorCode = "SERVICE_UNAVAILABLE";
  }

  // Send the error response
  res.status(statusCode).json({
    error: message,
    errorCode,
    details: details,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}

// Custom error classes
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
    this.statusCode = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message || "Unauthorized");
    this.name = "UnauthorizedError";
    this.statusCode = 401;
  }
}

class PaymentRequiredError extends Error {
  constructor(message) {
    super(message || "Payment Required");
    this.name = "PaymentRequiredError";
    this.statusCode = 402;
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message || "Forbidden");
    this.name = "ForbiddenError";
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message || "Not Found");
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

// Export error handler and custom error classes
module.exports = errorHandler;
module.exports.ValidationError = ValidationError;
module.exports.UnauthorizedError = UnauthorizedError;
module.exports.PaymentRequiredError = PaymentRequiredError;
module.exports.ForbiddenError = ForbiddenError;
module.exports.NotFoundError = NotFoundError;
