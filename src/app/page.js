import { Suspense } from "react";
import FindGetaways from "@/components/find/FindGetaways";

export const metadata = { title: "Find getaways · Holiday Planner" };

export default function FindGetawaysPage() {
  // FindGetaways reads the share link (?country=...), so it needs Suspense
  return (
    <Suspense fallback={null}>
      <FindGetaways />
    </Suspense>
  );
}
