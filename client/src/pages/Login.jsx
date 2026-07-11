import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import AnimatedRing from "../components/AnimatedRing.jsx";
import { IconCheck } from "../components/icons.jsx";

const FEATURES = [
  "Auto-splits any goal into monthly targets",
  "Real-time progress rings & charts",
  "Multiple goals, one dashboard",
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Decorative brand panel */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-16"
        style={{
          background: "linear-gradient(160deg, var(--accent) 0%, var(--accent-hover) 100%)",
        }}
      >
        <AnimatedRing
          percent={72}
          size={150}
          stroke={10}
          delay={0}
          className="absolute -left-10 top-16 opacity-90 animate-float-slow"
        />
        <AnimatedRing
          percent={45}
          size={100}
          stroke={8}
          delay={200}
          className="absolute right-10 top-40 opacity-70 animate-float"
        />
        <AnimatedRing
          percent={90}
          size={120}
          stroke={9}
          delay={400}
          className="absolute bottom-20 left-24 opacity-80 animate-float-fast"
        />

        <div className="relative z-10 max-w-md">
          <div className="mb-8 inline-block rounded-xl bg-white/95 px-4 py-2.5">
            <img src="/logo-full.png" alt="SmartSpendr" className="h-8 w-auto" />
          </div>

          <h2 className="mb-4 text-3xl font-bold leading-tight text-white">
            Turn your savings goals into a simple monthly checklist.
          </h2>
          <p className="mb-8 text-white/80">
            Set a target, pick a timeframe, and we'll break it down for you — check off each
            month as you save and watch your progress fill in.
          </p>

          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-white/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="page-shell flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <img src="/logo-icon.png" alt="SmartSpendr" className="h-10 w-10" />
            <span className="text-xl font-bold text-heading">SmartSpendr</span>
          </div>

          <h1 className="mb-1 text-2xl font-bold text-heading">Welcome back</h1>
          <p className="mb-6 text-sm text-subtle">Log in to keep tracking your savings goals.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-accent w-full">
              {submitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-subtle">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium link-accent">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
