import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Dot } from "@/components/ui/badge";
import { Avatar, Thumbnail } from "@/components/ui/media";
import { history, type HistoryItem } from "@/data";

type TabKey = "history" | "tips";

function Tab({
  active,
  dot,
  onClick,
  children,
}: {
  active?: boolean;
  dot?: boolean;
  onClick?: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative -mb-px pb-3 text-[15px] font-semibold transition-colors outline-none focus-visible:text-ink",
        active ? "text-positive" : "text-ink/70 hover:text-ink",
      )}
    >
      {children}
      {dot && <Dot className="absolute -right-2.5 top-0.5" />}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-positive" />
      )}
    </button>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar name={item.actor} size={48} />
      <p className="min-w-0 flex-1 text-[15px] text-dim">
        <span className="font-semibold text-ink">{item.actor}</span>
        <span className="text-dim">, {item.time}</span> {item.verb}{" "}
        <span className="font-semibold text-ink">{item.primary}</span> {item.connector}{" "}
        <span className="font-semibold text-ink">{item.secondary}</span>
      </p>
      {item.trailing.type === "thumb" ? (
        <Thumbnail seed={item.trailing.seed} size={48} />
      ) : (
        <Avatar name={item.trailing.name} size={32} />
      )}
    </div>
  );
}

export function NotificationPanel() {
  const [tab, setTab] = useState<TabKey>("history");
  return (
    <Card className="w-full max-w-[460px] p-2">
      <div className="flex gap-8 border-b border-[#eeeef4] px-4 pt-3">
        <Tab active={tab === "history"} onClick={() => setTab("history")}>
          History
        </Tab>
        <Tab active={tab === "tips"} dot onClick={() => setTab("tips")}>
          Design Tips
        </Tab>
      </div>

      {tab === "history" ? (
        <div className="px-3 py-1">
          {history.map((item, i) => (
            <HistoryRow key={i} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center px-4 text-sm text-dim">
          No design tips yet.
        </div>
      )}
    </Card>
  );
}
