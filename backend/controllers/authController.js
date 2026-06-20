const User = require("../models/User");
const generateOTP = require("../utils/generateOTP");
const { sendEmail, otpEmailTemplate } = require("../utils/sendEmail");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateTokens");
const jwt = require("jsonwebtoken");

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/auth", // only sent to auth routes (refresh/logout)
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user && user.isVerified) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const otp = generateOTP();

    if (user && !user.isVerified) {
      // Re-registration attempt for an unverified account: refresh details + OTP
      user.name = name;
      user.password = password;
      await user.setOTP(otp);
      await user.save();
    } else {
      user = new User({ name, email, password });
      await user.setOTP(otp);
      await user.save();
    }

    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      html: otpEmailTemplate(user.name, otp),
    });

    res.status(201).json({
      message: "Registration successful. An OTP has been sent to your email.",
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+otp +otpExpiry +otpAttempts"
    );

    if (!user) {
      return res.status(404).json({ message: "No account found for this email" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "No OTP pending. Please request a new one." });
    }
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }
    if (user.otpAttempts >= 5) {
      return res.status(429).json({ message: "Too many incorrect attempts. Please request a new OTP." });
    }

    const isMatch = await user.compareOTP(otp);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    user.isVerified = true;
    user.clearOTP();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      message: "Email verified successfully",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/resend-otp
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "No account found for this email" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const otp = generateOTP();
    await user.setOTP(otp);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your new verification code",
      html: otpEmailTemplate(user.name, otp),
    });

    res.status(200).json({ message: "A new OTP has been sent to your email" });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/refresh-token
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: "Refresh token not recognized" });
    }

    // Rotate the refresh token on every use
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (token) {
      const user = await User.findOne({ refreshToken: token }).select("+refreshToken");
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/auth/me (protected)
const getMe = async (req, res) => {
  res.status(200).json({ user: sanitizeUser(req.user) });
};

module.exports = { register, verifyOTP, resendOTP, login, refreshToken, logout, getMe };
