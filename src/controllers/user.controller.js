import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../middlewares/error.middleware.js";
import bcrypt from "bcrypt";
import otpGenerator from "otp-generator";
import apiInstance from "../config/brevo.js";





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

// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, college } = req.body;

    if (!name || !email || !password || !college) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCase: false,
      specialChars: false,
    });

    const hashedOtp = await bcrypt.hash(otp, 10);

    // Create user (unverified)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      college,
      otp: hashedOtp,
      otpExpires: Date.now() + 5 * 60 * 1000,
      isVerified: false,
    });

    // ✅ SEND OTP USING BREVO TEMPLATE
    const sendSmtpEmail = {
      to: [{ email }],
      templateId: 4, // 👈 YOUR TEMPLATE ID
      params: {
        otp: otp,
      },
      sender: {
        email: "prachimulay2@gmail.com", // verified sender
        name: "Campus Market",
      },
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(201).json({
      success: true,
      message: "OTP sent to email. Please verify.",
    });

  } catch (error) {
  console.error("REGISTER ERROR FULL:", {
    message: error.message,
    response: error.response?.body || error.response,
    stack: error.stack,
  });

  res.status(500).json({
    success: false,
    message: "Registration failed",
    error: error.response?.body || error.message,
  });
}

};




// Login user
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user.isVerified) {
  return res.status(401).json({
    message: "Please verify your email first"
  });
}

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const { accessToken, refreshToken } = await generateTokens(user._id);

  setCookies(res, accessToken, refreshToken);

  const safeUser = await User.findById(user._id).select("-password -refreshToken");

  res.status(200).json({
    success: true,
    message: "Login successful",
    token: accessToken,
    data: {
      user: safeUser,
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





