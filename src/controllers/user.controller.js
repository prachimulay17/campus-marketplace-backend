import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../middlewares/error.middleware.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

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
    secure: true,        // REQUIRED for HTTPS
    sameSite: "none",    // REQUIRED for cross-domain
  };


  res
    .cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 }) // 15 minutes
    .cookie("refreshToken", refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
};

// Register user (called after OTP verification)
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, college } = req.body;

    if (!name || !email || !password || !college) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // NOTE: Do NOT manually hash the password here.
    // The model's pre("save") hook (using bcryptjs) handles hashing automatically.
    // Double-hashing would make the password impossible to verify.
    const user = await User.create({
      name,
      email,
      password,
      college,
      isVerified: true,
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // Set cookies
    setCookies(res, accessToken, refreshToken);

    // Return safe user data
    const safeUser = await User.findById(user._id).select("-password -refreshToken");

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token: accessToken,
      data: {
        user: safeUser,
      },
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error.message);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};




// Login user
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log("[LOGIN] Request payload:", { email, password: "[HIDDEN]" });

  // Ensure case-insensitive email matching
  const normalizedEmail = email ? email.toLowerCase() : "";
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  // 1. Check if user exists
  if (!user) {
    console.log("[LOGIN] User not found for email:", normalizedEmail);
    return res.status(404).json({
      success: false,
      message: "Invalid email",
    });
  }

  // 2. Check if email is verified
  if (!user.isVerified) {
    console.log("[LOGIN] Email not verified for:", normalizedEmail);
    return res.status(403).json({
      success: false,
      message: "Please verify your email first",
    });
  }

  // 3. Check password using bcryptjs (same library used in model's pre-save hook)
  const isPasswordValid = await user.isPasswordCorrect(password);
  console.log("[LOGIN] Password valid:", isPasswordValid);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid password",
    });
  }

  // 4. Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);
  setCookies(res, accessToken, refreshToken);

  const safeUser = await User.findById(user._id).select("-password -refreshToken");

  console.log("[LOGIN] Login successful for:", normalizedEmail);

  res.status(200).json({
    success: true,
    message: "Login successful",
    token: accessToken,
    data: { user: safeUser },
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
    secure: true,        // REQUIRED for HTTPS
    sameSite: "none",    // REQUIRED for cross-domain
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
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token is required",
    });
  }

  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);

    setCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
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

// Forgot Password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide an email address",
    });
  }

  // 1. Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return a generic message to prevent email enumeration
    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  }

  // 2. Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send token to user's email
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

  const message = `
    <h1>You requested a password reset</h1>
    <p>Please go to this link to reset your password:</p>
    <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
    <p>This link is valid for 15 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  try {
    await sendEmail(user.email, "Password Reset Request", message);

    res.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      success: false,
      message: "There was an error sending the email. Try again later!",
    });
  }
});

// Reset Password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  // 1. Hash the incoming token
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // 2. Find user with that token AND token hasn't expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Token is invalid or has expired",
    });
  }

  // 3. Update the password and clear reset token fields
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // The pre-save hook will hash the new password
  await user.save();

  // 4. Optionally log them in immediately by generating tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);
  setCookies(res, accessToken, refreshToken);

  const safeUser = await User.findById(user._id).select("-password -refreshToken");

  res.status(200).json({
    success: true,
    message: "Password reset successful",
    token: accessToken,
    data: { user: safeUser },
  });
});
