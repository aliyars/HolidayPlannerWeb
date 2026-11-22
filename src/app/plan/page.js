import { Suspense } from "react";
import PlanTrip from "@/components/PlanTrip";

export const metadata = { title: "Plan trip · Holiday Planner" };

export default function PlanPage() {
  // PlanTrip reads the share link (?country=...), so it needs Suspense
  return (
    <Suspense fallback={null}>
      <PlanTrip />
    </Suspense>
  );
}
