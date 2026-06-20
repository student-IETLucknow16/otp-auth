const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving, only if it changed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// OTP is hashed the same way a password would be, so a DB leak doesn't expose live codes
userSchema.methods.setOTP = async function (rawOTP, ttlMinutes = 10) {
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(rawOTP, salt);
  this.otpExpiry = new Date(Date.now() + ttlMinutes * 60 * 1000);
  this.otpAttempts = 0;
};

userSchema.methods.compareOTP = function (candidateOTP) {
  if (!this.otp) return Promise.resolve(false);
  return bcrypt.compare(candidateOTP, this.otp);
};

userSchema.methods.clearOTP = function () {
  this.otp = undefined;
  this.otpExpiry = undefined;
  this.otpAttempts = 0;
};

module.exports = mongoose.model("User", userSchema);
