import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import GoalCard from "../components/GoalCard.jsx";
import GoalForm from "../components/GoalForm.jsx";
import client from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  async function loadGoals() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await client.get("/goals");
      setGoals(data.goals);
    } catch (err) {
      const message = err.response?.data?.error || "Could not load goals";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(payload) {
    const { data } = await client.post("/goals", payload);
    setShowForm(false);
    toast.success("Goal created");
    navigate(`/goals/${data.goal.id}`);
  }

  return (
    <Layout title="My Goals">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-heading">Your Savings Goals</h2>
        <button onClick={() => setShowForm(true)} className="btn-accent">
          + New Goal
        </button>
      </div>

      {loading ? (
        <p className="text-subtle">Loading goals...</p>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : goals.length === 0 ? (
        <div className="card border-dashed p-12 text-center text-subtle">
          No goals yet. Create your first savings goal to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {showForm && <GoalForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
    </Layout>
  );
}
