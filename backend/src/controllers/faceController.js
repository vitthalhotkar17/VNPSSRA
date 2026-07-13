const User = require("../models/User");
const { success, error } = require("../utils/response");
const { isValidDescriptor, checkImageQuality, verifyFaceMatch } = require("../utils/faceMatcher");

const MAX_ENROLLED_DESCRIPTORS = 3; // keep a few captures per student for robustness

const extractFirstImage = (req) => {
  const faceImage = req.body.faceImage;
  if (!faceImage) return null;
  const images = Array.isArray(faceImage) ? faceImage : [faceImage];
  const first = images[0];
  return typeof first === "string" ? first : null;
};

const registerFace = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+faceEmbeddings");
    if (!user) return error(res, "User not found", 404);

    const descriptor = req.body.faceDescriptor;
    if (!isValidDescriptor(descriptor)) {
      return error(res, "A valid face descriptor is required to register face data.", 400);
    }

    const image = extractFirstImage(req);
    if (image) {
      const quality = await checkImageQuality(image);
      if (!quality.passed) {
        return error(res, `Registration image quality failed: ${quality.reason}`, 400);
      }
      user.faceImage = image;
    }

    // Store up to MAX_ENROLLED_DESCRIPTORS reference descriptors for this student.
    const existing = Array.isArray(user.faceEmbeddings) ? user.faceEmbeddings : [];
    const updated = [...existing, descriptor].slice(-MAX_ENROLLED_DESCRIPTORS);
    user.faceEmbeddings = updated;

    if (Array.isArray(req.body.faceSignature)) {
      user.faceSignature = req.body.faceSignature;
    }

    await user.save();

    return success(res, { user, enrolledCount: updated.length }, "Face registered successfully.");
  } catch (err) {
    next(err);
  }
};

const getFaceData = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, "User not found", 404);

    return success(res, {
      id: user._id,
      name: user.name,
      role: user.role,
      faceImage: user.faceImage,
    }, "Face data fetched.");
  } catch (err) {
    next(err);
  }
};

const deleteFaceData = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, "User not found", 404);

    user.faceImage = null;
    user.faceEmbeddings = [];
    user.faceSignature = [];
    await user.save();

    return success(res, {}, "Face data deleted.");
  } catch (err) {
    next(err);
  }
};

const verifyFace = async (req, res, next) => {
  try {
    const descriptor = req.body.faceDescriptor;
    const image = extractFirstImage(req);
    const antiSpoofData = req.body.identityProof || null;

    const user = await User.findById(req.user._id).select("+faceEmbeddings");
    if (!user) return error(res, "User not found", 404);

    if (!user.faceEmbeddings?.length) {
      return error(res, "No face registered for this account. Please register your face first.", 400);
    }

    const result = await verifyFaceMatch({
      descriptor,
      storedDescriptors: user.faceEmbeddings,
      image,
      antiSpoofData,
    });

    return success(res, result, result.verified ? "Face verified" : "Face verification failed");
  } catch (err) {
    return error(res, err.message || "Face verification failed", 400);
  }
};

module.exports = {
  registerFace,
  verifyFace,
  getFaceData,
  deleteFaceData,
};
