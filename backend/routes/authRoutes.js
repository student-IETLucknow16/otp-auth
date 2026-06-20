const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  register,
  verifyOTP,
  resendOTP,
  login,
  refreshToken,
  logout,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Prevent abuse of OTP/login endpoints
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", otpLimiter, register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", otpLimiter, resendOTP);
router.post("/login", loginLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;
