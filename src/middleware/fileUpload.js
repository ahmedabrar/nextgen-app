// src/middleware/fileUpload.js - File upload middleware
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { ValidationError } = require('./errorHandler');

// Set up Google Cloud Storage if configured
let storage, bucket;
if (process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_STORAGE_BUCKET) {
  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
  bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET);
}

// Determine storage strategy (local or cloud)
const useCloudStorage = process.env.NODE_ENV === 'production' && !!bucket;

// Maximum file size (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// File extension to MIME type mapping for validation
const FILE_EXTENSIONS = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!useCloudStorage && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create safeguarding document subdirectory
const safeguardingDir = path.join(uploadDir, 'safeguarding');
if (!useCloudStorage && !fs.existsSync(safeguardingDir)) {
  fs.mkdirSync(safeguardingDir, { recursive: true });
}

// Configure local storage
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store safeguarding documents in the appropriate directory
    if (req.path.includes('/documents')) {
      cb(null, safeguardingDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate a secure filename
    const randomString = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const sanitizedFilename = path.basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    
    const newFilename = `${sanitizedFilename}-${timestamp}-${randomString}${extension}`;
    cb(null, newFilename);
  }
});

// Configure Google Cloud Storage
const cloudStorage = multer.memoryStorage();

// File filter to validate uploads
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new ValidationError('Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX'));
  }
  
  // Check file extension against stated MIME type
  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMimeType = FILE_EXTENSIONS[extension];
  
  if (!expectedMimeType || expectedMimeType !== file.mimetype) {
    return cb(new ValidationError('File extension does not match its content type'));
  }
  
  // Accept the file
  cb(null, true);
};

// Configure multer based on storage strategy
const upload = multer({
  storage: useCloudStorage ? cloudStorage : diskStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

// Middleware to handle file uploads to cloud storage
const handleCloudUpload = async (req, res, next) => {
  // Skip if not using cloud storage or no file was uploaded
  if (!useCloudStorage || !req.file) {
    return next();
  }
  
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const extension = path.extname(req.file.originalname);
    const sanitizedFilename = path.basename(req.file.originalname, extension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const randomString = crypto.randomBytes(8).toString('hex');
    
    const newFilename = `${sanitizedFilename}-${timestamp}-${randomString}${extension}`;
    
    // Determine the folder based on the route
    let folder = 'general';
    if (req.path.includes('/documents')) {
      folder = 'safeguarding';
    }
    
    // Full path in cloud storage
    const filePath = `${folder}/${newFilename}`;
    
    // Create a new blob in the bucket
    const blob = bucket.file(filePath);
    
    // Create a write stream
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: req.file.mimetype,
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          uploadedBy: req.user?.id || 'anonymous',
          uploadTime: new Date().toISOString()
        }
      }
    });
    
    // Handle stream errors
    blobStream.on('error', (error) => {
      logger.error('Error uploading file to cloud storage:', error);
      return next(new Error('Error uploading file to cloud storage'));
    });
    
    // Handle stream finish
    blobStream.on('finish', async () => {
      try {
        // Make the file public
        await blob.makePublic();
        
        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        // Update req.file with cloud storage info
        req.file.cloudStoragePath = filePath;
        req.file.cloudStoragePublicUrl = publicUrl;
        req.file.path = publicUrl; // For backward compatibility
        
        next();
      } catch (error) {
        logger.error('Error making file public:', error);
        return next(new Error('Error processing uploaded file'));
      }
    });
    
    // Write the file data to the stream
    blobStream.end(req.file.buffer);
  } catch (error) {
    logger.error('Cloud storage upload error:', error);
    return next(new Error('Error processing uploaded file'));
  }
};

// Middleware to run virus scan on uploaded files
const runVirusScan = async (req, res, next) => {
  // Skip if no file was uploaded
  if (!req.file) {
    return next();
  }
  
  try {
    // If using a virus scanning service, implement the scan here
    // For example, connecting to ClamAV or a cloud-based virus scanning API
    
    // This is a placeholder for actual virus scanning implementation
    const isSafe = true; // Assume file is safe for now
    
    if (!isSafe) {
      // Delete the uploaded file
      if (useCloudStorage && req.file.cloudStoragePath) {
        await bucket.file(req.file.cloudStoragePath).delete();
      } else if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      return next(new ValidationError('File failed virus scan'));
    }
    
    next();
  } catch (error) {
    logger.error('Virus scan error:', error);
    return next(new Error('Error scanning uploaded file'));
  }
};

// Create an enhanced upload middleware
const enhancedUpload = (fieldName = 'file') => {
  return [
    // First apply the basic multer upload
    upload.single(fieldName),
    
    // Then handle cloud storage if needed
    handleCloudUpload,
    
    // Finally run virus scan
    runVirusScan
  ];
};

// Export the middleware
module.exports = enhancedUpload;

// Also export the basic upload for more flexible usage
module.exports.upload = upload;

// Export utility functions for handling files
module.exports.deleteFile = async (filePath) => {
  try {
    if (useCloudStorage && filePath.includes('storage.googleapis.com')) {
      // Extract the path from the URL
      const url = new URL(filePath);
      const pathParts = url.pathname.split('/');
      const bucketName = pathParts[1];
      const objectPath = pathParts.slice(2).join('/');
      
      // Delete the file
      await storage.bucket(bucketName).file(objectPath).delete();
    } else if (fs.existsSync(filePath)) {
      // Delete local file
      fs.unlinkSync(filePath);
    }
    
    return true;
  } catch (error) {
    logger.error('Error deleting file:', error);
    return false;
  }
};

// Generate a signed URL for private files
module.exports.getSignedUrl = async (filePath, expiryMinutes = 15) => {
  if (!useCloudStorage) {
    return filePath; // Just return the local path
  }
  
  try {
    // Extract the path if it's a full URL
    let objectPath = filePath;
    if (filePath.includes('storage.googleapis.com')) {
      const url = new URL(filePath);
      const pathParts = url.pathname.split('/');
      objectPath = pathParts.slice(2).join('/');
    }
    
    // Generate signed URL
    const [signedUrl] = await bucket.file(objectPath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + (expiryMinutes * 60 * 1000)
    });
    
    return signedUrl;
  } catch (error) {
    logger.error('Error generating signed URL:', error);
    return filePath; // Fall back to the original path
  }
};