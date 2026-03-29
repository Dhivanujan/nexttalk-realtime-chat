import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/express";

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${ext}`;
    cb(null, uniqueFilename);
  },
});

// File filter to allow only image files
const fileFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload an image."));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

router.post("/", requireAuth, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Return the URL that can be used to access the image
    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ url: imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to upload image" });
  }
});

export default router;