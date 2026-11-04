import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { subscribeActivePlan, type Plan, type Session } from "../lib/plans";

type Ctx = { plan: Plan | null; sessions: Session[]; loading: boolean };
const PlanCtx = createContext<Ctx | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const uid = useAuth().user?.uid;
  const [state, setState] = useState<Ctx>({ plan: null, sessions: [], loading: true });
  useEffect(() => {
    if (!uid) return;
    return subscribeActivePlan(uid, (d) => setState({ ...d, loading: false }), () => setState((s) => ({ ...s, loading: false })));
  }, [uid]);
  return <PlanCtx.Provider value={state}>{children}</PlanCtx.Provider>;
}

export const usePlan = () => {
  const c = useContext(PlanCtx);
  if (!c) throw new Error("usePlan must be used inside PlanProvider");
  return c;
};
