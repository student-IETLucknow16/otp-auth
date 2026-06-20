import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RESEND_COOLDOWN = 30; // seconds

const VerifyOtp = () => {
  const { verifyOTP, resendOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = location.state?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyOTP(email, otp);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    try {
      await resendOTP(email);
      setInfo("A new code has been sent to your email.");
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend code");
    }
  };

  return (
    <div className="page-center">
      <form className="auth-card" onSubmit={handleVerify}>
        <h1>Verify your email</h1>
        <p className="subtitle">Enter the 6-digit code we sent to your inbox.</p>

        {error && <div className="alert">{error}</div>}
        {info && <div className="alert alert-success">{info}</div>}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          OTP code
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify email"}
        </button>

        <button
          type="button"
          className="link-button"
          onClick={handleResend}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </form>
    </div>
  );
};

export default VerifyOtp;
