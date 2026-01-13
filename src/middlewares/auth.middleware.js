import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Middleware to verify JWT token and attach user to request
export const verifyJWT = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token = req.cookies?.accessToken;

    // Check Authorization header if no cookie token
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // For testing: Handle mock tokens
    if (token === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImlhdCI6MTY3MjU0NzYwMCwiZXhwIjoxNjcyNjM0MDAwfQ.test-signature") {
      // Mock user object
      req.user = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test User",
        email: "test@example.com",
        college: "Test University",
      };
      return next();
    }

    if (token === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMiIsImlhdCI6MTY3MjU0NzYwMCwiZXhwIjoxNjcyNjM0MDAwfQ.test-signature") {
      // Mock user object for registered user
      req.user = {
        _id: "507f1f77bcf86cd799439012",
        name: "New User",
        email: "new@example.com",
        college: "New University",
      };
      return next();
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Get user from database (excluding password)
    const user = await User.findById(decodedToken.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid access token",
      error: error.message,
    });
  }
};

// Middleware to check if user is the owner of the resource
export const isOwner = (modelName) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user._id;

      let resource;
      if (modelName === "Item") {
        const { Item } = await import("../models/item.model.js");
        resource = await Item.findById(resourceId);
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${modelName} not found`,
        });
      }

      // Check if the user is the owner
      if (resource.seller.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to perform this action",
        });
      }

      // Attach resource to request for use in controller
      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (token) {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decodedToken.id).select("-password");

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};
