import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

import sendEmail from "../utils/sendEmail.js";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔒 Access logic based on role
    if (user.role === "admin" && !user.isApproved) {
      return res
        .status(403)
        .json({ message: "Admin not approved to access dashboard" });
    }

    if (user.role === "reporter" && !user.isApproved) {
      return res
        .status(403)
        .json({ message: "Reporter account pending approval" });
    }

    // ✅ User can log in (admin, reporter, user)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        reporterFormSubmitted: user.reporterFormSubmitted,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate reset token and expiry
    const token = crypto.randomBytes(16).toString("hex");
    const tokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetToken = token;
    user.resetTokenExpiry = tokenExpiry;
    await user.save();

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // Send email
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Reset your password using this link: ${resetLink}`,
    });

    res.json({ message: "Password reset link sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Validate input
    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired" });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear reset token & expiry
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ success: false, message: "ID Token required" });
    }

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: "Google account has no email" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(8).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = new User({
        name,
        email,
        password: hashedPassword,
        originalPassword: randomPassword,
        avatar: picture,
        role: "user",
        isApproved: true, // optional
      });

      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: fullName,
      email,
      password: hashedPassword,
      role: "user",
      originalPassword: password,
    });

    await newUser.save();

    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, bio, location } = req.body;

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        name,
        bio,
        location,
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      location: user.location,
      avatar: user.avatar || null,
      initials:
        user.initials ||
        user.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase(),
      joinDate: user.joinDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      }),
      role: user.role,
      status: user.status,
      isApproved: user.isApproved,
      stats: user.stats,
      bio: user.bio,
      settings: user.settings,
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const updateCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, location, bio, avatarUrl, settings } = req.body;

    // Validate settings.privacySettings if provided
    if (settings?.privacySettings) {
      const validFields = [
        "profileVisibility",
        "showReadingHistory",
        "showBookmarks",
        "allowComments",
        "shareReadingStats",
        "allowFollowers",
      ];
      for (const key of Object.keys(settings.privacySettings)) {
        if (!validFields.includes(key)) {
          return res
            .status(400)
            .json({ message: `Invalid privacy setting: ${key}` });
        }
        if (typeof settings.privacySettings[key] !== "boolean") {
          return res
            .status(400)
            .json({ message: `Invalid value for ${key}: must be boolean` });
        }
      }
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (location) user.location = location;
    if (bio) user.bio = bio;
    if (avatarUrl) user.avatar = avatarUrl;
    user.initials = user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    if (settings) {
      user.settings = {
        ...user.settings,
        contentPreferences:
          settings.contentPreferences || user.settings.contentPreferences,
        notificationSettings:
          settings.notificationSettings || user.settings.notificationSettings,
        privacySettings:
          settings.privacySettings || user.settings.privacySettings,
        appearanceSettings:
          settings.appearanceSettings || user.settings.appearanceSettings,
      };
    }

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      location: user.location,
      avatar: user.avatar || null,
      initials: user.initials,
      joinDate: user.joinDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      }),
      role: user.role,
      status: user.status,
      isApproved: user.isApproved,
      stats: user.stats,
      bio: user.bio,
      settings: user.settings,
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res
      .status(500)
      .json({ message: "Failed to update user", error: err.message });
  }
};