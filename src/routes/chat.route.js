import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  createConversation,
  getConversations,
  getMessages,
  markConversationRead,
  deleteMessage,
  hideConversation,
  unhideConversation,
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/error.middleware.js";

const router = Router();

// All chat routes require authentication
router.use(verifyJWT);

const createConvValidation = [
  body("itemId").isMongoId().withMessage("Invalid item ID"),
  body("sellerId").isMongoId().withMessage("Invalid seller ID"),
  body("initialMessage").optional().isString().trim().notEmpty().withMessage("Message cannot be empty")
];

const getMessagesValidation = [
  param("id").isMongoId().withMessage("Invalid conversation ID"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100")
];

const convIdParamValidation = [
  param("id").isMongoId().withMessage("Invalid conversation ID"),
];

router.post("/conversations", createConvValidation, handleValidationErrors, createConversation);
router.get("/conversations", getConversations);
router.get("/conversations/:id/messages", getMessagesValidation, handleValidationErrors, getMessages);
router.patch("/conversations/:id/read", convIdParamValidation, handleValidationErrors, markConversationRead);
router.patch("/conversations/:id/hide", convIdParamValidation, handleValidationErrors, hideConversation);
router.patch("/conversations/:id/unhide", convIdParamValidation, handleValidationErrors, unhideConversation);

const deleteMessageValidation = [
  param("id").isMongoId().withMessage("Invalid message ID"),
  body("type").isIn(["forMe", "forEveryone"]).withMessage("type must be 'forMe' or 'forEveryone'")
];

router.delete("/messages/:id", deleteMessageValidation, handleValidationErrors, deleteMessage);

export default router;
