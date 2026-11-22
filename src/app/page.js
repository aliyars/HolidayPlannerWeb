import { Suspense } from "react";
import FindBreaks from "@/components/FindBreaks";

export const metadata = { title: "Find getaways · Holiday Planner" };

export default function FindBreaksPage() {
  // FindBreaks reads the share link (?country=...), so it needs Suspense
  return (
    <Suspense fallback={null}>
      <FindBreaks />
    </Suspense>
  );
}
