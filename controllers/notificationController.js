import User from "../models/User.js";

// Save FCM token
export const saveFcmToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({ message: "User ID and FCM token required" });
    }

    await User.findByIdAndUpdate(userId, { fcmToken });
    res.json({ success: true, message: "Token saved successfully" });
  } catch (err) {
    console.error("Save token error:", err);
    res.status(500).json({ message: "Server error" });
  }
};