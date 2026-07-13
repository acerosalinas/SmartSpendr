import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Goals from "./pages/Goals.jsx";
import GoalDetail from "./pages/GoalDetail.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import ExpenseLog from "./pages/ExpenseLog.jsx";
import CategorySummary from "./pages/CategorySummary.jsx";
import DebtBills from "./pages/DebtBills.jsx";
import PersonalSavings from "./pages/PersonalSavings.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <Goals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals/:id"
        element={
          <ProtectedRoute>
            <GoalDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expense-log"
        element={
          <ProtectedRoute>
            <ExpenseLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/category-summary"
        element={
          <ProtectedRoute>
            <CategorySummary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/debt-bills"
        element={
          <ProtectedRoute>
            <DebtBills />
          </ProtectedRoute>
        }
      />
      <Route
        path="/personal-savings"
        element={
          <ProtectedRoute>
            <PersonalSavings />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
