import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import { globalLimiter } from "./middlewares/rateLimit.middleware.js";
import userRouter from "./routes/user.route.js";
import itemRouter from "./routes/item.route.js";
import uploadRouter from "./routes/upload.route.js";
import otpRoutes from "./routes/otp.route.js";
import chatRoutes from "./routes/chat.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { setupSwagger } from "./config/swagger.config.js";

const app = express();

const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) return false;
  return true;
};

app.use(compression({ filter: shouldCompress }));

app.use("/public", express.static("public", {
  maxAge: "1d",
  etag: true,
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Apply global rate limiting
app.use(globalLimiter);

// Prevent NoSQL injection
app.use(mongoSanitize());
// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parsing middleware
app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Setup Swagger Documentation
setupSwagger(app);

// API routes
app.use("/api/auth", userRouter);
app.use("/api/items", itemRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/otp", otpRoutes);
app.use("/api/chat", chatRoutes);


// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export { app };
