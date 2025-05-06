// src/middleware/authentication.js - Authentication middleware
const { PrismaClient } = require("@prisma/client");
const { verifyJwt, refreshAccessToken } = require("../utils/authUtils");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

/**
 * Authentication middleware for verifying user requests
 * Works with either Firebase or Clerk auth tokens
 */
async function authenticateRequest(req, res, next) {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    // Check if using Clerk or Firebase
    const isClerkAuth = process.env.AUTH_PROVIDER === "clerk";

    let userId;

    if (isClerkAuth) {
      // Verify with Clerk
      const { clerkClient } = require("@clerk/clerk-sdk-node");

      try {
        // Verify session
        const session = await clerkClient.sessions.verifySession(token);

        if (!session || !session.userId) {
          return res
            .status(401)
            .json({ error: "Unauthorized - Invalid session" });
        }

        userId = session.userId;
      } catch (error) {
        logger.error("Clerk authentication error:", error);
        return res.status(401).json({ error: "Unauthorized - Invalid token" });
      }
    } else {
      // Verify with Firebase
      const { getAuth } = require("firebase-admin/auth");

      try {
        // Verify the ID token
        const decodedToken = await getAuth().verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        logger.error("Firebase authentication error:", error);
        return res.status(401).json({ error: "Unauthorized - Invalid token" });
      }
    }

    // Find the user in our database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        clubProfile: {
          select: {
            id: true,
          },
        },
        parentProfile: {
          select: {
            id: true,
            isPremium: true,
          },
        },
        adminProfile: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized - User not found" });
    }

    // Attach user to request object
    req.user = user;

    // Add profile ID based on role
    switch (user.role) {
      case "CLUB":
        req.user.profileId = user.clubProfile?.id;
        break;
      case "PARENT":
        req.user.profileId = user.parentProfile?.id;
        req.user.isPremium = user.parentProfile?.isPremium || false;
        break;
      case "ADMIN":
        req.user.profileId = user.adminProfile?.id;
        req.user.adminRole = user.adminProfile?.role;
        break;
    }

    // Record last access time (do not await to avoid slowing down the request)
    switch (user.role) {
      case "ADMIN":
        if (user.adminProfile?.id) {
          prisma.adminProfile
            .update({
              where: { id: user.adminProfile.id },
              data: { lastActive: new Date() },
            })
            .catch((error) => {
              logger.error("Error updating admin last active time:", error);
            });
        }
        break;
      default:
        // For other user types we could track last activity as well
        break;
    }

    // Continue to the next middleware/route handler
    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error during authentication" });
  }
}

/**
 * Middleware to check if user has admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden - Admin access required" });
  }
  next();
}

/**
 * Middleware to check for super admin privileges
 */
function requireSuperAdmin(req, res, next) {
  if (
    !req.user ||
    req.user.role !== "ADMIN" ||
    req.user.adminRole !== "SUPER_ADMIN"
  ) {
    return res
      .status(403)
      .json({ error: "Forbidden - Super admin access required" });
  }
  next();
}

/**
 * Middleware to check if user has club role
 */
function requireClub(req, res, next) {
  if (!req.user || req.user.role !== "CLUB") {
    return res.status(403).json({ error: "Forbidden - Club access required" });
  }
  next();
}

/**
 * Middleware to check if user has parent role
 */
function requireParent(req, res, next) {
  if (!req.user || req.user.role !== "PARENT") {
    return res
      .status(403)
      .json({ error: "Forbidden - Parent access required" });
  }
  next();
}

/**
 * Middleware to check if parent has premium status
 */
function requirePremium(req, res, next) {
  if (!req.user || req.user.role !== "PARENT" || !req.user.isPremium) {
    return res
      .status(403)
      .json({ error: "Forbidden - Premium subscription required" });
  }
  next();
}

/**
 * Middleware to check ownership of a resource
 * @param {string} modelName - The Prisma model name
 * @param {string} paramName - The request parameter containing the resource ID
 * @param {string} ownerField - The field in the model that contains the owner's ID (default: 'userId')
 */
function requireOwnership(modelName, paramName, ownerField = "userId") {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];

      if (!resourceId) {
        return res
          .status(400)
          .json({ error: `Missing resource ID parameter: ${paramName}` });
      }

      // Check if the resource exists and is owned by the user
      const resource = await prisma[modelName].findUnique({
        where: { id: resourceId },
        select: { [ownerField]: true },
      });

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Allow access if the user is the owner or an admin
      if (resource[ownerField] !== req.user.id && req.user.role !== "ADMIN") {
        return res
          .status(403)
          .json({ error: "Forbidden - You do not own this resource" });
      }

      next();
    } catch (error) {
      logger.error("Ownership check error:", error);
      return res
        .status(500)
        .json({ error: "Internal server error checking resource ownership" });
    }
  };
}

module.exports = authenticateRequest;
module.exports.requireAdmin = requireAdmin;
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.requireClub = requireClub;
module.exports.requireParent = requireParent;
module.exports.requirePremium = requirePremium;
module.exports.requireOwnership = requireOwnership;
