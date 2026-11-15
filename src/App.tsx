import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import { PlanProvider } from "./components/PlanProvider";
import { WorkoutsProvider } from "./components/WorkoutsProvider";
import { Analytics, Calendar, History, Overview, Plan, PlanSetup } from "./pages/Pages";

function Gate() {
  const { user, loading, signIn } = useAuth();
  const [signInError, setSignInError] = useState("");
  if (loading) return <div className="grid h-full place-items-center text-xs text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="grid h-full place-items-center">
        <div className="w-80 rounded-lg border border-line bg-card p-8 text-center">
          <p className="text-lg font-semibold"><span className="text-accent">N</span> Momentum</p>
          <p className="mb-6 mt-2 text-xs text-muted">Sign in to track your running and training.</p>
          <button onClick={async () => { setSignInError(""); try { await signIn(); } catch (e) { const m = e instanceof Error ? e.message : "Sign-in failed."; if (!/popup-closed|cancel/i.test(m)) setSignInError(m); } }} className="w-full rounded-md bg-accent px-4 py-2 text-xs font-semibold hover:brightness-110">
            Continue with Google
          </button>
          {signInError && <p role="alert" className="mt-3 text-xs text-accent">{signInError}</p>}
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
