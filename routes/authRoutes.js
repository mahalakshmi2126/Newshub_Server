import express from "express";
import { forgotPassword, resetPassword, loginUser, googleLogin, registerUser, getUserProfile, updateUserProfile, getCurrentUser, updateCurrentUser } from "../controllers/authController.js";

import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Forgot Password
router.post('/forgot-password', forgotPassword);

// Reset Password
router.post('/reset-password/:token', resetPassword);

router.post("/login", loginUser);

router.post("/google-login", googleLogin);  

router.post('/register', registerUser);

// Get profile
router.get('/get/:id', getUserProfile);

// Update profile
router.put('/update/:id', updateUserProfile);

router.get('/me', authenticate, getCurrentUser);

router.put('/me', authenticate, updateCurrentUser);

export default router;