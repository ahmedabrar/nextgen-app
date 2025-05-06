#!/usr/bin/env node
// scripts/setup.js - Setup script for the Next Gen Safeguarding App

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { faker } = require("@faker-js/faker");
const bcrypt = require("bcrypt");
const readline = require("readline");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const config = require("../src/config");

// Initialize Prisma client
const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to ask question
const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// Helper function to run system commands
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Command stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

// Setup database with migrations
async function setupDatabase() {
  console.log("\n📦 Setting up database...");

  try {
    // Run Prisma migrations
    console.log("Running database migrations...");
    await runCommand("npx prisma migrate deploy");
    console.log("✅ Database migrations completed successfully");

    return true;
  } catch (error) {
    console.error("❌ Failed to setup database:", error);
    return false;
  }
}

// Create admin user
async function createAdminUser() {
  console.log("\n👤 Creating admin user...");

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      console.log("ℹ️ Admin user already exists - skipping creation");
      return true;
    }

    // Get admin details
    const email = await question("Enter admin email: ");
    const firstName = await question("Enter admin first name: ");
    const lastName = await question("Enter admin last name: ");
    const password = await question("Enter admin password (min 8 chars): ");

    // Validate input
    if (!email.includes("@") || password.length < 8) {
      console.error("❌ Invalid email or password too short");
      return false;
    }

    // Hash password
    const saltRounds = config.security.bcryptSaltRounds;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role: "ADMIN",
        password: hashedPassword,
        adminProfile: {
          create: {
            role: "SUPER_ADMIN",
          },
        },
      },
    });

    console.log(`✅ Admin user created with ID: ${admin.id}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to create admin user:", error);
    return false;
  }
}

// Create directory structure
async function createDirectoryStructure() {
  console.log("\n📂 Creating directory structure...");

  const directories = [
    "uploads",
    "uploads/safeguarding",
    "uploads/profiles",
    "logs",
  ];

  try {
    for (const dir of directories) {
      const dirPath = path.resolve(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } else {
        console.log(`Directory already exists: ${dir}`);
      }
    }

    console.log("✅ Directory structure created successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to create directory structure:", error);
    return false;
  }
}

// Generate seed data for development
async function generateSeedData() {
  if (process.env.NODE_ENV === "production") {
    console.log("ℹ️ Skipping seed data generation in production environment");
    return true;
  }

  const shouldSeed = await question(
    "\n🌱 Do you want to generate seed data for development? (y/n): "
  );

  if (shouldSeed.toLowerCase() !== "y") {
    console.log("ℹ️ Skipping seed data generation");
    return true;
  }

  console.log("\n🌱 Generating seed data...");

  try {
    // Generate parent users
    console.log("Creating parent users...");
    const parentUsers = [];

    for (let i = 0; i < 10; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName });

      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role: "PARENT",
          password: await bcrypt.hash("Password123", 10),
          parentProfile: {
            create: {
              address: faker.location.streetAddress(),
              isPremium: Math.random() > 0.7,
            },
          },
        },
      });

      parentUsers.push(user);

      // Add children for each parent
      const numChildren = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numChildren; j++) {
        await prisma.child.create({
          data: {
            parentId: user.parentProfile.id,
            firstName: faker.person.firstName(),
            lastName: user.lastName,
            dateOfBirth: faker.date.past({ years: 12 }),
          },
        });
      }
    }

    console.log(`✅ Created ${parentUsers.length} parent users with children`);

    // Generate club users and profiles
    console.log("Creating club profiles...");
    const clubUsers = [];
    const activityTypes = [
      "SPORTS",
      "ARTS",
      "MUSIC",
      "EDUCATION",
      "OUTDOORS",
      "TECH",
    ];
    const verificationStatuses = [
      "PENDING",
      "IN_REVIEW",
      "APPROVED",
      "REJECTED",
    ];
    const businessTypes = [
      "LIMITED_COMPANY",
      "SOLE_TRADER",
      "CHARITY",
      "PARTNERSHIP",
      "CIC",
    ];

    for (let i = 0; i < 15; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName });
      const clubName =
        faker.company.name() +
        " " +
        faker.helpers.arrayElement([
          "Sports Club",
          "Arts Academy",
          "Music School",
          "Learning Center",
          "Outdoor Adventures",
          "Tech Club",
        ]);

      // Randomize club attributes
      const status = faker.helpers.arrayElement(verificationStatuses);
      const safeguardingTier =
        status === "APPROVED"
          ? faker.helpers.arrayElement(["STANDARD", "ENHANCED", "PREMIUM"])
          : "STANDARD";
      const businessType = faker.helpers.arrayElement(businessTypes);
      const randomActivities = faker.helpers.arrayElements(
        activityTypes,
        Math.floor(Math.random() * 3) + 1
      );

      // Create club user with profile
      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role: "CLUB",
          password: await bcrypt.hash("Password123", 10),
          clubProfile: {
            create: {
              name: clubName,
              description: faker.lorem.paragraphs(2),
              phoneNumber: faker.phone.number(),
              email: `info@${clubName.toLowerCase().replace(/\s+/g, "")}.com`,
              website: faker.internet.url(),
              address: faker.location.streetAddress(),
              postcode: "M1 1AA", // Simplified UK postcode for demo
              businessType,
              registrationNumber: faker.helpers.arrayElement([
                "",
                "",
                faker.string.numeric(8),
              ]),
              ageRangeMin: faker.helpers.arrayElement([0, 3, 5, 7, 9]),
              ageRangeMax: faker.helpers.arrayElement([11, 14, 16, 18]),
              activityTypes: randomActivities,
              verificationStatus: status,
              safeguardingTier: safeguardingTier,
              subscriptionStatus: status === "APPROVED" ? "ACTIVE" : "INACTIVE",
              subscriptionTier:
                status === "APPROVED"
                  ? faker.helpers.arrayElement(["BASIC", "STANDARD", "PREMIUM"])
                  : "BASIC",
            },
          },
        },
        include: {
          clubProfile: true,
        },
      });

      clubUsers.push(user);

      // Create documents for approved or in-review clubs
      if (status === "APPROVED" || status === "IN_REVIEW") {
        const documentTypes = [
          "SAFEGUARDING_POLICY",
          "INSURANCE",
          "DBS_CERTIFICATE",
          "RISK_ASSESSMENT",
        ];

        if (safeguardingTier === "ENHANCED" || safeguardingTier === "PREMIUM") {
          documentTypes.push("STAFF_QUALIFICATIONS", "HEALTH_SAFETY");
        }

        for (const docType of documentTypes) {
          await prisma.document.create({
            data: {
              clubId: user.clubProfile.id,
              documentType: docType,
              filename: `${docType.toLowerCase()}_${user.clubProfile.id}.pdf`,
              fileUrl: `/uploads/safeguarding/${docType.toLowerCase()}_${user.clubProfile.id}.pdf`,
              uploadedAt: faker.date.recent({ days: 30 }),
              expiryDate: faker.date.future({ years: 1 }),
              status: status === "APPROVED" ? "APPROVED" : "PENDING",
            },
          });
        }
      }
    }

    console.log(`✅ Created ${clubUsers.length} club profiles with documents`);

    // Generate reviews
    if (
      clubUsers.some(
        (club) => club.clubProfile.verificationStatus === "APPROVED"
      )
    ) {
      console.log("Creating club reviews...");

      const approvedClubs = clubUsers.filter(
        (club) => club.clubProfile.verificationStatus === "APPROVED"
      );

      let reviewCount = 0;

      // Add 2-5 reviews for each approved club
      for (const club of approvedClubs) {
        const numReviews = Math.floor(Math.random() * 4) + 2;

        for (let i = 0; i < numReviews; i++) {
          const parentUser = faker.helpers.arrayElement(parentUsers);
          const rating = Math.floor(Math.random() * 3) + 3; // 3-5 star ratings for positive reviews

          await prisma.review.create({
            data: {
              clubId: club.clubProfile.id,
              userId: parentUser.id,
              rating,
              title: faker.helpers.arrayElement([
                "Great experience",
                "Highly recommended",
                "Excellent club",
                "Professional staff",
                "Kids love it",
                "Safe environment",
              ]),
              content: faker.lorem.paragraph(),
              anonymous: Math.random() > 0.7,
              status: "PUBLISHED",
            },
          });

          reviewCount++;
        }
      }

      console.log(`✅ Created ${reviewCount} club reviews`);
    }

    // Generate reports
    console.log("Creating safety reports...");

    const reportCategories = [
      "SAFETY_CONCERN",
      "POLICY_VIOLATION",
      "MISLEADING_INFO",
      "INAPPROPRIATE_BEHAVIOR",
      "OTHER",
    ];

    const reportStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"];
    const reportPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

    let reportCount = 0;

    // Create 5-10 reports across all clubs
    const numReports = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < numReports; i++) {
      const club = faker.helpers.arrayElement(clubUsers);
      const parentUser = faker.helpers.arrayElement(parentUsers);

      await prisma.report.create({
        data: {
          clubId: club.clubProfile.id,
          userId: parentUser.id,
          title: faker.helpers.arrayElement([
            "Facility safety concern",
            "Staff behavior",
            "Missing safeguarding policy",
            "Inappropriate language",
            "Misleading information",
            "Other concern",
          ]),
          description: faker.lorem.paragraph(),
          category: faker.helpers.arrayElement(reportCategories),
          status: faker.helpers.arrayElement(reportStatuses),
          priority: faker.helpers.arrayElement(reportPriorities),
          anonymous: Math.random() > 0.3,
        },
      });

      reportCount++;
    }

    console.log(`✅ Created ${reportCount} safety reports`);

    // Generate notifications
    console.log("Creating notifications...");

    let notificationCount = 0;

    // Create notifications for all users
    const allUsers = [...parentUsers, ...clubUsers];

    for (const user of allUsers) {
      const numNotifications = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < numNotifications; i++) {
        const notificationType =
          user.role === "PARENT"
            ? faker.helpers.arrayElement(["SYSTEM", "REVIEW", "REPORT"])
            : faker.helpers.arrayElement([
                "SYSTEM",
                "VERIFICATION",
                "DOCUMENT",
                "SUBSCRIPTION",
              ]);

        let title, message;

        switch (notificationType) {
          case "SYSTEM":
            title = "Welcome to the Safeguarding App";
            message =
              "Thank you for joining our community dedicated to child safety.";
            break;
          case "VERIFICATION":
            title = faker.helpers.arrayElement([
              "Verification Status Updated",
              "Document Review Complete",
              "Verification Reminder",
            ]);
            message = faker.lorem.sentence();
            break;
          case "DOCUMENT":
            title = faker.helpers.arrayElement([
              "Document Expiring Soon",
              "Document Approved",
              "Document Rejected",
            ]);
            message = faker.lorem.sentence();
            break;
          case "REVIEW":
            title = faker.helpers.arrayElement([
              "Review Published",
              "Review Response",
              "Club Update",
            ]);
            message = faker.lorem.sentence();
            break;
          case "REPORT":
            title = faker.helpers.arrayElement([
              "Report Status Update",
              "Report Resolution",
              "Safety Report",
            ]);
            message = faker.lorem.sentence();
            break;
          case "SUBSCRIPTION":
            title = faker.helpers.arrayElement([
              "Subscription Activated",
              "Subscription Reminder",
              "Premium Features Available",
            ]);
            message = faker.lorem.sentence();
            break;
        }

        await prisma.notification.create({
          data: {
            recipientId: user.id,
            title,
            message,
            type: notificationType,
            isRead: Math.random() > 0.7,
          },
        });

        notificationCount++;
      }
    }

    console.log(`✅ Created ${notificationCount} notifications`);

    console.log("✅ Seed data generated successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to generate seed data:", error);
    return false;
  }
}

// Main setup function
async function setup() {
  console.log("🚀 Starting Next Gen Safeguarding App setup...");

  try {
    // Setup steps
    const databaseSetup = await setupDatabase();
    if (!databaseSetup) return false;

    const directorySetup = await createDirectoryStructure();
    if (!directorySetup) return false;

    const adminSetup = await createAdminUser();
    if (!adminSetup) return false;

    const seedSetup = await generateSeedData();
    if (!seedSetup) return false;

    console.log("\n✨ Setup completed successfully!");
    console.log("You can now start the application with: npm run dev");

    return true;
  } catch (error) {
    console.error("❌ Setup failed:", error);
    return false;
  } finally {
    // Close Prisma connection and readline interface
    await prisma.$disconnect();
    rl.close();
  }
}

// Run setup
setup()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unhandled error during setup:", error);
    process.exit(1);
  });
