import { Router } from "express";
import { uploadMultiple } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

const router = Router();

// Upload images to Cloudinary
router.post("/images", verifyJWT, uploadMultiple("images", 5), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded",
    });
  }

  try {
    const uploadPromises = req.files.map(file => uploadToCloudinary(file.path));
    const uploadResults = await Promise.all(uploadPromises);

    // Filter out failed uploads
    const successfulUploads = uploadResults.filter(result => result !== null);

    if (successfulUploads.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload images",
      });
    }

    const imageUrls = successfulUploads.map(result => result.secure_url);

    res.status(200).json({
      success: true,
      message: `${successfulUploads.length} image(s) uploaded successfully`,
      data: {
        images: imageUrls,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading images",
      error: error.message,
    });
  }
}));

export default router;
