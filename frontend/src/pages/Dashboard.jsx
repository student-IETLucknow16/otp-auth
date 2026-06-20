import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="page-center">
      <div className="auth-card">
        <h1>Welcome, {user?.name}</h1>
        <p className="subtitle">You're signed in and your email is verified.</p>
        <div className="profile-row">
          <span>Email</span>
          <strong>{user?.email}</strong>
        </div>
        <div className="profile-row">
          <span>Status</span>
          <strong>{user?.isVerified ? "Verified" : "Unverified"}</strong>
        </div>
        <button onClick={handleLogout}>Log out</button>
      </div>
    </div>
  );
};

export default Dashboard;
