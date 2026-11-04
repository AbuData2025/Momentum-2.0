import { EmptyState, PageHeader } from "../components/ui";
import LogWorkoutButton from "../components/LogWorkoutButton";

export { default as Overview } from "./Overview";
export { default as Analytics } from "./Analytics";
export { default as History } from "./History";

const stub = (eyebrow: string, title: string, subtitle: string) => () => (
  <>
    <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} action={<LogWorkoutButton />} />
    <EmptyState title="Coming in a later milestone" body="This screen is routed and styled; its data arrives next." />
  </>
);
export { default as Calendar } from "./Calendar";
export { default as Plan } from "./Plan";
export { default as PlanSetup } from "./PlanSetup";
