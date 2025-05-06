// src/config/index.js - Application configuration
require("dotenv").config();

/**
 * Application configuration
 * Centralizes all configuration values and validates required environment variables
 */
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || "development",
    apiPrefix: process.env.API_PREFIX || "/api",
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",")
      : ["http://localhost:3000", "http://localhost:19006"],
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || "10"),
    ssl: process.env.DATABASE_SSL === "true",
    logQueries: process.env.DATABASE_LOG_QUERIES === "true",
  },

  // Authentication configuration
  auth: {
    provider: process.env.AUTH_PROVIDER || "firebase", // 'firebase' or 'clerk'
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    firebaseCredentials: process.env.FIREBASE_CREDENTIALS_PATH,
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
  },

  // File storage configuration
  storage: {
    provider: process.env.STORAGE_PROVIDER || "local", // 'local' or 'gcloud'
    uploadDir: process.env.UPLOAD_DIR || "uploads",
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB
    gcpProjectId: process.env.GOOGLE_CLOUD_PROJECT,
    gcpBucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
    gcpCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },

  // Email configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || "smtp", // 'smtp' or 'sendgrid'
    from: process.env.EMAIL_FROM || "noreply@safeguardingapp.com",
    smtp: {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
  },

  // Payments configuration
  payments: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    plans: {
      basic: process.env.STRIPE_BASIC_PLAN_ID,
      standard: process.env.STRIPE_STANDARD_PLAN_ID,
      premium: process.env.STRIPE_PREMIUM_PLAN_ID,
    },
  },

  // Messaging configuration
  messaging: {
    provider: process.env.MESSAGING_PROVIDER || "twilio", // 'twilio' or 'whatsapp'
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    whatsapp: {
      apiKey: process.env.WHATSAPP_API_KEY,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    },
  },

  // Logging configuration
  logging: {
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    format: process.env.LOG_FORMAT || "json", // 'json' or 'text'
    errorFile: process.env.LOG_ERROR_FILE || "logs/error.log",
    combinedFile: process.env.LOG_COMBINED_FILE || "logs/combined.log",
  },

  // Admin configuration
  admin: {
    email: process.env.ADMIN_EMAIL,
    notificationEmail:
      process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL,
  },

  // Client URLs
  clientUrls: {
    web: process.env.WEB_CLIENT_URL || "http://localhost:3000",
    mobile: process.env.MOBILE_CLIENT_URL || "exp://localhost:19006",
  },

  // Feature flags
  features: {
    documentReminders: process.env.FEATURE_DOCUMENT_REMINDERS !== "false",
    automatedVerification:
      process.env.FEATURE_AUTOMATED_VERIFICATION === "true",
    parentReviews: process.env.FEATURE_PARENT_REVIEWS !== "false",
    premiumSubscriptions: process.env.FEATURE_PREMIUM_SUBSCRIPTIONS !== "false",
    messagingSystem: process.env.FEATURE_MESSAGING_SYSTEM === "true",
    aiFeatures: process.env.FEATURE_AI === "true",
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"), // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Security settings
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "10"),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
    lockoutTime: parseInt(process.env.LOCKOUT_TIME || "900000"), // 15 minutes
    passwordResetExpiry: parseInt(
      process.env.PASSWORD_RESET_EXPIRY || "3600000"
    ), // 1 hour
  },
};

/**
 * Validate required configuration values
 */
function validateConfig() {
  const requiredVars = [
    { key: "database.url", value: config.database.url, name: "DATABASE_URL" },
  ];

  // Add auth provider specific requirements
  if (config.auth.provider === "firebase") {
    requiredVars.push({
      key: "auth.firebaseCredentials",
      value: config.auth.firebaseCredentials,
      name: "FIREBASE_CREDENTIALS_PATH",
    });
  } else if (config.auth.provider === "clerk") {
    requiredVars.push({
      key: "auth.clerkSecretKey",
      value: config.auth.clerkSecretKey,
      name: "CLERK_SECRET_KEY",
    });
  }

  // Add storage provider specific requirements
  if (config.storage.provider === "gcloud") {
    requiredVars.push(
      {
        key: "storage.gcpProjectId",
        value: config.storage.gcpProjectId,
        name: "GOOGLE_CLOUD_PROJECT",
      },
      {
        key: "storage.gcpBucket",
        value: config.storage.gcpBucket,
        name: "GOOGLE_CLOUD_STORAGE_BUCKET",
      },
      {
        key: "storage.gcpCredentials",
        value: config.storage.gcpCredentials,
        name: "GOOGLE_APPLICATION_CREDENTIALS",
      }
    );
  }

  // Add payment provider requirements if premium features enabled
  if (config.features.premiumSubscriptions) {
    requiredVars.push(
      {
        key: "payments.stripeSecretKey",
        value: config.payments.stripeSecretKey,
        name: "STRIPE_SECRET_KEY",
      },
      {
        key: "payments.stripeWebhookSecret",
        value: config.payments.stripeWebhookSecret,
        name: "STRIPE_WEBHOOK_SECRET",
      }
    );
  }

  // Add messaging provider requirements if messaging enabled
  if (config.features.messagingSystem) {
    if (config.messaging.provider === "twilio") {
      requiredVars.push(
        {
          key: "messaging.twilio.accountSid",
          value: config.messaging.twilio.accountSid,
          name: "TWILIO_ACCOUNT_SID",
        },
        {
          key: "messaging.twilio.authToken",
          value: config.messaging.twilio.authToken,
          name: "TWILIO_AUTH_TOKEN",
        }
      );
    } else if (config.messaging.provider === "whatsapp") {
      requiredVars.push({
        key: "messaging.whatsapp.apiKey",
        value: config.messaging.whatsapp.apiKey,
        name: "WHATSAPP_API_KEY",
      });
    }
  }

  // Check required variables
  const missingVars = requiredVars.filter((v) => !v.value);

  if (missingVars.length > 0) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "Error: Missing required environment variables:"
    );
    missingVars.forEach((v) => {
      console.error(`  - ${v.name} (${v.key})`);
    });
    process.exit(1);
  }
}

// Only validate in production to allow easier local development
if (process.env.NODE_ENV === "production") {
  validateConfig();
}

module.exports = config;
