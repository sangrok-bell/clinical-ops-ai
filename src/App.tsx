import { ShieldCheck } from "lucide-react";
import { SetupShell } from "@/somnus/setup/SetupShell";

// App owns the single brand header; SetupShell renders only the stepper + the 6-step
// lifecycle. No top tabs — landing = SetupShell idx 0 = ① protocol/SOP upload. (nf/19)
export default function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex items-center gap-2.5 border-b border-[#eeeef4] bg-surface px-8 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
          <ShieldCheck className="size-4" />
        </span>
        <span className="font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
          Clinical Ops AI
        </span>
      </header>
      <SetupShell />
    </div>
  );
}
