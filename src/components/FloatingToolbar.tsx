import { Bell, Settings, Flame, Cloud, Plus } from "lucide-react";
import { Dot } from "@/components/ui/badge";

export function FloatingToolbar() {
  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <button
        type="button"
        aria-label="Notifications, new"
        className="glass relative flex size-12 items-center justify-center rounded-full text-icon shadow-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Bell className="size-5" />
        <Dot className="absolute right-3 top-3" />
      </button>

      <button
        type="button"
        aria-label="Settings"
        className="flex size-10 items-center justify-center rounded-full text-icon transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Settings className="size-5" />
      </button>

      <button
        type="button"
        aria-label="Trending"
        className="flex size-10 items-center justify-center rounded-full text-icon transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Flame className="size-5" />
      </button>

      <button
        type="button"
        aria-label="Uploads, 9 pending"
        className="relative flex size-10 items-center justify-center rounded-full text-icon transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Cloud className="size-5" />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-onaccent ring-2 ring-canvas">
          9
        </span>
      </button>

      <button
        type="button"
        aria-label="Add"
        className="flex size-10 items-center justify-center rounded-full text-icon transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
