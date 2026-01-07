import { Router } from "express";
import { body } from "express-validator";
import {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  markItemAsSold,
  getItemsBySeller,
  getMyItems,
} from "../controllers/item.controller.js";
import { verifyJWT, isOwner } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/error.middleware.js";

const router = Router();

// Validation rules
const createItemValidation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .isIn(["Books", "Electronics", "Furniture", "Clothing", "Others"])
    .withMessage("Invalid category"),
  body("condition")
    .isIn(["New", "Like New", "Used", "Poor"])
    .withMessage("Invalid condition"),
  body("images")
    .isArray({ min: 1, max: 5 })
    .withMessage("At least 1 image is required, maximum 5 images allowed"),
  body("images.*")
    .isURL()
    .withMessage("Each image must be a valid URL"),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location cannot exceed 100 characters"),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),
];

const updateItemValidation = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .optional()
    .isIn(["Books", "Electronics", "Furniture", "Clothing", "Others"])
    .withMessage("Invalid category"),
  body("condition")
    .optional()
    .isIn(["New", "Like New", "Used", "Poor"])
    .withMessage("Invalid condition"),
  body("images")
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage("Maximum 5 images allowed"),
  body("images.*")
    .optional()
    .isURL()
    .withMessage("Each image must be a valid URL"),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location cannot exceed 100 characters"),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),
];

// Routes
// Public routes
router.get("/", getAllItems);
router.get("/:id", getItemById);
router.get("/seller/:sellerId", getItemsBySeller);

// Protected routes (require authentication)
router.use(verifyJWT); // All routes below require authentication

router.get("/user/my-items", getMyItems);
router.post("/", createItemValidation, handleValidationErrors, createItem);
router.patch("/:id", isOwner("Item"), updateItemValidation, handleValidationErrors, updateItem);
router.delete("/:id", isOwner("Item"), deleteItem);
router.patch("/:id/sold", isOwner("Item"), markItemAsSold);

export default router;
