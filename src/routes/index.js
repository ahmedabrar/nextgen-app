// src/routes/index.js - Main routes file
const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const clubRoutes = require("./clubRoutes");
const parentRoutes = require("./parentRoutes");
const documentRoutes = require("./documentRoutes");
const reviewRoutes = require("./reviewRoutes");
const reportRoutes = require("./reportRoutes");
const adminRoutes = require("./adminRoutes");
const notificationRoutes = require("./notificationRoutes");
const paymentRoutes = require("./paymentRoutes");
const messageRoutes = require("./messageRoutes");

// Use route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clubs", clubRoutes);
router.use("/parents", parentRoutes);
router.use("/documents", documentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/reports", reportRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payments", paymentRoutes);
router.use("/messages", messageRoutes);

module.exports = router;
