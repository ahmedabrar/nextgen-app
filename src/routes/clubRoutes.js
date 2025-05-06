// src/routes/clubRoutes.js - Club routes
const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const validate = require("../middleware/validate");
const clubController = require("../controllers/clubController");
const auth = require("../middleware/authentication");
const upload = require("../middleware/fileUpload");

// Get all clubs with filtering
router.get(
  "/",
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("name").optional().isString().trim(),
  query("activityType").optional().isString().trim(),
  query("verificationStatus").optional().isString().trim(),
  query("safeguardingTier").optional().isString().trim(),
  query("ageMin").optional().isInt({ min: 0, max: 18 }).toInt(),
  query("ageMax").optional().isInt({ min: 0, max: 100 }).toInt(),
  query("postcode").optional().isString().trim(),
  query("distance").optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
  clubController.getClubs
);

// Get a single club by ID
router.get(
  "/:id",
  param("id").isUUID().withMessage("Invalid club ID"),
  validate,
  clubController.getClubById
);

// Create a new club (requires authentication)
router.post(
  "/",
  auth,
  body("name")
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Club name must be between 2 and 100 characters"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be between 20 and 2000 characters"),
  body("phoneNumber")
    .isString()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage("Invalid phone number format"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
  body("website").optional().isURL().withMessage("Invalid website URL"),
  body("address")
    .isString()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Address must be between 5 and 200 characters"),
  body("postcode")
    .isString()
    .trim()
    .matches(/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i)
    .withMessage("Invalid UK postcode format"),
  body("businessType")
    .isString()
    .isIn([
      "LIMITED_COMPANY",
      "SOLE_TRADER",
      "CHARITY",
      "PARTNERSHIP",
      "CIC",
      "OTHER",
    ])
    .withMessage("Invalid business type"),
  body("registrationNumber").optional().isString().trim(),
  body("vatNumber").optional().isString().trim(),
  body("ageRangeMin")
    .isInt({ min: 0, max: 18 })
    .toInt()
    .withMessage("Minimum age must be between 0 and 18"),
  body("ageRangeMax")
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage("Maximum age must be between 1 and 100"),
  body("activityTypes")
    .isArray({ min: 1 })
    .withMessage("At least one activity type is required")
    .custom((value) => {
      const allowedTypes = [
        "SPORTS",
        "ARTS",
        "MUSIC",
        "EDUCATION",
        "OUTDOORS",
        "TECH",
        "OTHER",
      ];
      return value.every((type) => allowedTypes.includes(type));
    })
    .withMessage("Invalid activity type"),
  validate,
  clubController.createClub
);

// Update a club (requires ownership or admin role)
router.put(
  "/:id",
  auth,
  param("id").isUUID().withMessage("Invalid club ID"),
  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Club name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be between 20 and 2000 characters"),
  body("phoneNumber")
    .optional()
    .isString()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage("Invalid phone number format"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid email address"),
  body("website").optional().isURL().withMessage("Invalid website URL"),
  body("address")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Address must be between 5 and 200 characters"),
  body("postcode")
    .optional()
    .isString()
    .trim()
    .matches(/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i)
    .withMessage("Invalid UK postcode format"),
  body("businessType")
    .optional()
    .isString()
    .isIn([
      "LIMITED_COMPANY",
      "SOLE_TRADER",
      "CHARITY",
      "PARTNERSHIP",
      "CIC",
      "OTHER",
    ])
    .withMessage("Invalid business type"),
  body("registrationNumber").optional().isString().trim(),
  body("vatNumber").optional().isString().trim(),
  body("ageRangeMin")
    .optional()
    .isInt({ min: 0, max: 18 })
    .toInt()
    .withMessage("Minimum age must be between 0 and 18"),
  body("ageRangeMax")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage("Maximum age must be between 1 and 100"),
  body("activityTypes")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one activity type is required")
    .custom((value) => {
      const allowedTypes = [
        "SPORTS",
        "ARTS",
        "MUSIC",
        "EDUCATION",
        "OUTDOORS",
        "TECH",
        "OTHER",
      ];
      return value.every((type) => allowedTypes.includes(type));
    })
    .withMessage("Invalid activity type"),
  validate,
  auth.requireOwnership("clubProfile", "id"),
  clubController.updateClub
);

// Search clubs
router.get(
  "/search",
  query("query").optional().isString().trim(),
  query("activityType").optional().isString().trim(),
  query("minAge").optional().isInt({ min: 0, max: 18 }).toInt(),
  query("maxAge").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("location").optional().isString().trim(),
  query("verifiedOnly").optional().isBoolean().toBoolean(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
  clubController.searchClubs
);

// Get club reviews
router.get(
  "/:id/reviews",
  param("id").isUUID().withMessage("Invalid club ID"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("sortBy")
    .optional()
    .isString()
    .isIn(["recent", "highest", "lowest"])
    .withMessage("Invalid sort option"),
  validate,
  clubController.getClubReviews
);

// Get club documents (requires ownership or admin role)
router.get(
  "/:id/documents",
  auth,
  param("id").isUUID().withMessage("Invalid club ID"),
  validate,
  auth.requireOwnership("clubProfile", "id", "userId"),
  clubController.getClubDocuments
);

// Upload a document for a club (requires ownership)
router.post(
  "/:id/documents",
  auth,
  param("id").isUUID().withMessage("Invalid club ID"),
  body("documentType")
    .isString()
    .isIn([
      "SAFEGUARDING_POLICY",
      "INSURANCE",
      "DBS_CERTIFICATE",
      "RISK_ASSESSMENT",
      "STAFF_QUALIFICATIONS",
      "HEALTH_SAFETY",
      "OTHER",
    ])
    .withMessage("Invalid document type"),
  body("expiryDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Invalid expiry date format (YYYY-MM-DD)"),
  validate,
  auth.requireOwnership("clubProfile", "id"),
  // Use multer middleware for file upload with size limits and file type validations
  upload.single("document"),
  clubController.uploadDocument
);

// Update club verification status (admin only)
router.put(
  "/:id/verification",
  auth,
  auth.requireAdmin,
  param("id").isUUID().withMessage("Invalid club ID"),
  body("status")
    .isString()
    .isIn(["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"])
    .withMessage("Invalid verification status"),
  body("safeguardingTier")
    .optional()
    .isString()
    .isIn(["STANDARD", "ENHANCED", "PREMIUM"])
    .withMessage("Invalid safeguarding tier"),
  body("adminNotes").optional().isString().trim(),
  validate,
  clubController.updateVerificationStatus
);

// Manage subscription for a club
router.post(
  "/:id/subscription",
  auth,
  param("id").isUUID().withMessage("Invalid club ID"),
  body("action")
    .isString()
    .isIn(["create", "cancel", "update"])
    .withMessage("Invalid subscription action"),
  body("planId")
    .optional()
    .isString()
    .trim()
    .withMessage("Plan ID is required for create/update actions"),
  body("paymentMethodId").optional().isString().trim(),
  validate,
  auth.requireOwnership("clubProfile", "id"),
  clubController.manageSubscription
);

// Delete a club (only by owner or admin)
router.delete(
  "/:id",
  auth,
  param("id").isUUID().withMessage("Invalid club ID"),
  validate,
  auth.requireOwnership("clubProfile", "id"),
  clubController.deleteClub
);

module.exports = router;
