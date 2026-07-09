import { useState } from "react";
import Layout from "../components/Layout.jsx";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileMessage("");
    setProfileError("");
    setSavingProfile(true);
    try {
      const { data } = await client.put("/auth/profile", { full_name: fullName, email });
      setUser(data.user);
      setProfileMessage("Profile updated");
    } catch (err) {
      setProfileError(err.response?.data?.error || "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    setSavingPassword(true);
    try {
      await client.put("/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated");
    } catch (err) {
      setPasswordError(err.response?.data?.error || "Could not update password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <Layout title="My Profile">
      <div className="mx-auto max-w-xl space-y-6">
        <form onSubmit={handleProfileSubmit} className="card space-y-4 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
            Account Details
          </h2>
          <div>
            <label className="field-label">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
            />
          </div>
          {profileMessage && <p className="text-sm text-emerald-500">{profileMessage}</p>}
          {profileError && <p className="text-sm text-red-500">{profileError}</p>}
          <button type="submit" disabled={savingProfile} className="btn-accent">
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="card space-y-4 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
            Change Password
          </h2>
          <div>
            <label className="field-label">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="field-input"
            />
          </div>
          {passwordMessage && <p className="text-sm text-emerald-500">{passwordMessage}</p>}
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          <button type="submit" disabled={savingPassword} className="btn-accent">
            {savingPassword ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
