import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

// Generate access and refresh tokens
const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Store refresh token in user document (in production, use Redis or secure cookie)
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error("Token generation failed");
  }
};

// Set secure cookies
const setCookies = (res, accessToken, refreshToken) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };

  res
    .cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 }) // 15 minutes
    .cookie("refreshToken", refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
};

// Register user
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, college } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    college,
  });

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  // Get user without password
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  // Set cookies
  setCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: createdUser,
    },
  });
});

// Login user
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for verification
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Check password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  // Get user without password
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  // Set cookies
  setCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: loggedInUser,
    },
  });
});

// Logout user
export const logoutUser = asyncHandler(async (req, res) => {
  // Clear refresh token from user
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  // Clear cookies
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };

  res
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .status(200)
    .json({
      success: true,
      message: "Logout successful",
    });
});

// Refresh access token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token is required",
    });
  }

  try {
    // Verify refresh token
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user
    const user = await User.findById(decodedToken.id);
    if (!user || user.refreshToken !== incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const { accessToken, newRefreshToken } = await generateTokens(user._id);

    // Set cookies
    setCookies(res, accessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

// Get current user profile
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

// Update user profile
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, college, avatar } = req.body;
  const userId = req.user._id;

  const updateData = {};
  if (name) updateData.name = name;
  if (college) updateData.college = college;
  if (avatar) updateData.avatar = avatar;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      user: updatedUser,
    },
  });
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Find user with password
  const user = await User.findById(userId).select("+password");

  // Check current password
  const isCurrentPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  // Update password (pre-save hook will hash it)
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});


