// src/utils/logger.js - Logging utility
const winston = require("winston");
const { format } = winston;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Add colors to winston
winston.addColors(colors);

// Create custom format for console logging
const consoleFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.colorize({ all: true }),
  format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${info.splat ? ` ${info.splat}` : ""}${info.stack ? `\n${info.stack}` : ""}`
  )
);

// Create custom format for file logging
const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.json()
);

// Determine the log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "info";
};

// Create transports (outputs) for logs
const transports = [
  // Console logger
  new winston.transports.Console({
    level: level(),
    format: consoleFormat,
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === "production") {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file with all levels
    new winston.transports.File({
      filename: "logs/combined.log",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create and configure the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "safeguarding-api" },
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    // Remove trailing newline
    logger.http(message.trim());
  },
};

// Utility function to mask sensitive data in logs
logger.maskSensitiveData = (obj) => {
  if (!obj) return obj;

  // Create a deep copy to avoid modifying the original object
  const maskedObj = JSON.parse(JSON.stringify(obj));

  // List of field names that should be masked
  const sensitiveFields = [
    "password",
    "confirmPassword",
    "currentPassword",
    "newPassword",
    "token",
    "accessToken",
    "refreshToken",
    "secret",
    "apiKey",
    "stripeToken",
    "cardNumber",
    "cvv",
    "expiryDate",
    "ssn",
    "dob",
    "dateOfBirth",
    "address",
    "phoneNumber",
  ];

  // Function to recursively mask sensitive fields
  const maskFields = (object) => {
    if (!object || typeof object !== "object") return;

    Object.keys(object).forEach((key) => {
      // Check if current key should be masked
      if (
        sensitiveFields.includes(key) ||
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase())
        )
      ) {
        // Mask the value based on its type
        if (typeof object[key] === "string") {
          // Show only the first and last characters
          const value = object[key];
          object[key] =
            value.length > 6
              ? `${value.substring(0, 1)}****${value.substring(value.length - 1)}`
              : "******";
        } else {
          object[key] = "******";
        }
      } else if (typeof object[key] === "object" && object[key] !== null) {
        // Recursively process nested objects
        maskFields(object[key]);
      }
    });
  };

  maskFields(maskedObj);
  return maskedObj;
};

// Log decorator for async functions
logger.trackExecution = (fn, name = fn.name) => {
  return async (...args) => {
    const start = Date.now();
    logger.debug(`Starting ${name}`);

    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      logger.debug(`Completed ${name} in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`Failed ${name} after ${duration}ms: ${error.message}`, {
        error,
      });
      throw error;
    }
  };
};

module.exports = logger;
