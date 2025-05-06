// src/middleware/validate.js - Validation middleware
const { validationResult } = require("express-validator");
const { ValidationError } = require("./errorHandler");
const logger = require("../utils/logger");

/**
 * Express middleware to validate request data using express-validator
 * Checks for validation errors and returns a consistent error response
 */
const validate = (req, res, next) => {
  // Run validation result
  const errors = validationResult(req);

  // If no errors, continue
  if (errors.isEmpty()) {
    return next();
  }

  // Format the errors
  const formattedErrors = errors.array().map((error) => ({
    field: error.param,
    message: error.msg,
    value: error.value,
  }));

  // Log the validation errors
  logger.debug("Validation errors:", {
    path: req.path,
    method: req.method,
    errors: formattedErrors,
  });

  // Create a custom error with validation details
  const error = new ValidationError("Validation failed", formattedErrors);

  // Pass the error to the next error handler
  next(error);
};

/**
 * Custom validation helpers
 */
const customValidators = {
  /**
   * Validate UK postcodes
   * @param {string} postcode - The postcode to validate
   * @returns {boolean} True if valid
   */
  isUkPostcode: (postcode) => {
    // UK postcode regex pattern
    const ukPostcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    return ukPostcodePattern.test(postcode);
  },

  /**
   * Validate that a value is a valid safeguarding tier
   * @param {string} tier - The tier to validate
   * @returns {boolean} True if valid
   */
  isSafeguardingTier: (tier) => {
    const validTiers = ["STANDARD", "ENHANCED", "PREMIUM"];
    return validTiers.includes(tier);
  },

  /**
   * Validate that a value is a valid verification status
   * @param {string} status - The status to validate
   * @returns {boolean} True if valid
   */
  isVerificationStatus: (status) => {
    const validStatuses = [
      "PENDING",
      "IN_REVIEW",
      "APPROVED",
      "REJECTED",
      "SUSPENDED",
    ];
    return validStatuses.includes(status);
  },

  /**
   * Validate that a value is a valid document type
   * @param {string} type - The document type to validate
   * @returns {boolean} True if valid
   */
  isDocumentType: (type) => {
    const validTypes = [
      "SAFEGUARDING_POLICY",
      "INSURANCE",
      "DBS_CERTIFICATE",
      "RISK_ASSESSMENT",
      "STAFF_QUALIFICATIONS",
      "HEALTH_SAFETY",
      "OTHER",
    ];
    return validTypes.includes(type);
  },

  /**
   * Validate that a value is a valid activity type
   * @param {string} type - The activity type to validate
   * @returns {boolean} True if valid
   */
  isActivityType: (type) => {
    const validTypes = [
      "SPORTS",
      "ARTS",
      "MUSIC",
      "EDUCATION",
      "OUTDOORS",
      "TECH",
      "OTHER",
    ];
    return validTypes.includes(type);
  },

  /**
   * Validate that a value is a valid report category
   * @param {string} category - The report category to validate
   * @returns {boolean} True if valid
   */
  isReportCategory: (category) => {
    const validCategories = [
      "SAFETY_CONCERN",
      "POLICY_VIOLATION",
      "MISLEADING_INFO",
      "INAPPROPRIATE_BEHAVIOR",
      "OTHER",
    ];
    return validCategories.includes(category);
  },

  /**
   * Validate that a value is a valid report priority
   * @param {string} priority - The report priority to validate
   * @returns {boolean} True if valid
   */
  isReportPriority: (priority) => {
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    return validPriorities.includes(priority);
  },

  /**
   * Validate that a value is a valid report status
   * @param {string} status - The report status to validate
   * @returns {boolean} True if valid
   */
  isReportStatus: (status) => {
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"];
    return validStatuses.includes(status);
  },

  /**
   * Validate that a value is a valid subscription tier
   * @param {string} tier - The subscription tier to validate
   * @returns {boolean} True if valid
   */
  isSubscriptionTier: (tier) => {
    const validTiers = ["BASIC", "STANDARD", "PREMIUM"];
    return validTiers.includes(tier);
  },

  /**
   * Validate that a value is a valid business type
   * @param {string} type - The business type to validate
   * @returns {boolean} True if valid
   */
  isBusinessType: (type) => {
    const validTypes = [
      "LIMITED_COMPANY",
      "SOLE_TRADER",
      "CHARITY",
      "PARTNERSHIP",
      "CIC",
      "OTHER",
    ];
    return validTypes.includes(type);
  },

  /**
   * Validate a phone number format
   * @param {string} phone - The phone number to validate
   * @returns {boolean} True if valid
   */
  isPhoneNumber: (phone) => {
    // Basic phone number regex that allows for different formats
    const phonePattern = /^[0-9+\-\s()]{7,20}$/;
    return phonePattern.test(phone);
  },
};

// Export the validation middleware and custom validators
module.exports = validate;
module.exports.customValidators = customValidators;
