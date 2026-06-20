// Generates a 6-digit numeric OTP as a string, e.g. "048213"
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = generateOTP;
