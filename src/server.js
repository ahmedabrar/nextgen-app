// src/server.js - Main server entry point
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const { PrismaClient } = require("@prisma/client");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const authenticateRequest = require("./middleware/authentication");
const logger = require("./utils/logger");
const documentReminderService = require("./services/documentReminderService");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(express.json({ limit: "10mb" })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded request bodies

// Configure CORS
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? [process.env.CLIENT_URL, process.env.ADMIN_URL]
      : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain paths like webhooks
    const skipPaths = ["/api/payments/webhook"];
    return skipPaths.includes(req.path);
  },
});
app.use("/api/", apiLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Authentication middleware (except for public routes)
app.use("/api", (req, res, next) => {
  // List of paths that don't require authentication
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/clubs/search",
    "/api/payments/webhook",
    "/api/health",
  ];

  // Skip authentication for public paths or OPTIONS requests
  if (
    publicPaths.some((path) => req.path.startsWith(path)) ||
    req.method === "OPTIONS"
  ) {
    return next();
  }

  return authenticateRequest(req, res, next);
});

// API Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);

  // Schedule document reminder service
  if (process.env.NODE_ENV === "production") {
    documentReminderService.scheduleDocumentReminders();
    logger.info("Document reminder service scheduled");
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  // Graceful shutdown
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  // Close Prisma connection
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
