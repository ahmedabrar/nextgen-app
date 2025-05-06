#!/bin/bash

# Script to create folder structure and empty files for Next Gen Safeguarding App

# Create main directories
mkdir -p src/config src/controllers src/middleware src/routes src/services src/utils
mkdir -p prisma/migrations
mkdir -p uploads/safeguarding uploads/profiles
mkdir -p logs
mkdir -p scripts
mkdir -p public

# Create empty files

# Root files
touch package.json
touch .env.example
touch README.md
touch .gitignore

# Prisma schema
touch prisma/schema.prisma

# Main server file
touch src/server.js

# Config files
touch src/config/index.js

# Route files
touch src/routes/index.js
touch src/routes/authRoutes.js
touch src/routes/userRoutes.js
touch src/routes/clubRoutes.js
touch src/routes/parentRoutes.js
touch src/routes/documentRoutes.js
touch src/routes/reviewRoutes.js
touch src/routes/reportRoutes.js
touch src/routes/adminRoutes.js
touch src/routes/notificationRoutes.js
touch src/routes/paymentRoutes.js
touch src/routes/messageRoutes.js

# Middleware files
touch src/middleware/authentication.js
touch src/middleware/errorHandler.js
touch src/middleware/fileUpload.js
touch src/middleware/validate.js

# Utils files
touch src/utils/logger.js
touch src/utils/authUtils.js

# Service files
touch src/services/documentReminderService.js
touch src/services/paymentService.js
touch src/services/adminService.js
touch src/services/clubService.js

# Controller files
touch src/controllers/clubController.js
touch src/controllers/userController.js
touch src/controllers/reviewController.js
touch src/controllers/reportController.js
touch src/controllers/adminController.js
touch src/controllers/documentController.js
touch src/controllers/authController.js

# Setup script
touch scripts/setup.js

echo "Folder structure and empty files created successfully!"