const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const profileUploadDir = path.join(__dirname, "../uploads/profiles");
const faceUploadDir = path.join(__dirname, "../uploads/faces");

ensureDir(profileUploadDir);
ensureDir(faceUploadDir);

// ─── Storage: profile images ─────────────────────────────────────────────────
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(profileUploadDir);
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${uuidv4()}${ext}`);
  },
});

// ─── Storage: face images ─────────────────────────────────────────────────────
const faceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(faceUploadDir);
    cb(null, faceUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `face_${uuidv4()}${ext}`);
  },
});

// ─── File filter: images only ────────────────────────────────────────────────
const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, png, webp) are allowed."), false);
  }
};

// ─── Exported multer instances ───────────────────────────────────────────────
const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadFace = multer({
  storage: faceStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = { uploadProfile, uploadFace };
