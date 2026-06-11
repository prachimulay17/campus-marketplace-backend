import express from "express";
import { sendOtp, verifyOtp } from "../controllers/otp.controller.js";
import { otpLimiter } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

router.post("/send", otpLimiter, sendOtp);
router.post("/verify", otpLimiter, verifyOtp);

export default router;
