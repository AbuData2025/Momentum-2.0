import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import { PlanProvider } from "./components/PlanProvider";
import { WorkoutsProvider } from "./components/WorkoutsProvider";
import { Analytics, Calendar, History, Overview, Plan, PlanSetup } from "./pages/Pages";

function Gate() {
  const { user, loading, signIn } = useAuth();
  if (loading) return <div className="grid h-full place-items-center text-xs text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="grid h-full place-items-center">
        <div className="w-80 rounded-lg border border-line bg-card p-8 text-center">
          <p className="text-lg font-semibold"><span className="text-accent">N</span> Momentum</p>
          <p className="mb-6 mt-2 text-xs text-muted">Sign in to track your running and training.</p>
          <button onClick={signIn} className="w-full rounded-md bg-accent px-4 py-2 text-xs font-semibold hover:brightness-110">
            Continue with Google
          </button>
        </div>
      </div>
    );
  return (
    <WorkoutsProvider><PlanProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="history" element={<History />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="plan" element={<Plan />} />
          <Route path="plan/new" element={<PlanSetup />} />
        </Route>
      </Routes>
    </PlanProvider></WorkoutsProvider>
  );
}

export default function App() {
  return <BrowserRouter><AuthProvider><Gate /></AuthProvider></BrowserRouter>;
}
