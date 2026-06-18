import { ChevronsUpDown, LayoutGrid, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CountPill } from "@/components/ui/badge";
import { primaryNav, pagesNav, tags, type NavEntry, type TagTone } from "@/data";

function NavRow({ icon: Icon, label, count, tone, active }: NavEntry) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand",
        active
          ? "bg-elevated text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          : "text-ink/85 hover:bg-elevated/60",
      )}
    >
      <Icon className={cn("size-5", active ? "text-ink" : "text-icon")} />
      <span className="flex-1 font-medium">{label}</span>
      {count !== undefined && (
        <CountPill tone={tone} urgent={tone === "danger"}>
          {count}
        </CountPill>
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-dim/80">
      {children}
    </p>
  );
}

const tagDot: Record<TagTone, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  caution: "bg-caution",
  positive: "bg-positive",
};

function TagRow({ label, tone }: { label: string; tone: TagTone }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-[15px] text-ink/85 transition-colors outline-none hover:bg-elevated/60 focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className={cn("size-2.5 rounded-[5px]", tagDot[tone])} />
      <span className="flex-1 font-medium">{label}</span>
    </button>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col gap-1 bg-sidebar p-3">
      {/* logo header */}
      <div className="flex items-center gap-3 px-1 py-2">
        <div className="bg-logo-sphere size-11 shrink-0 rounded-full ring-2 ring-white/10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">Clinical Gandalf</p>
          <p className="truncate text-xs text-dim">Design Tutorial</p>
        </div>
        <ChevronsUpDown className="size-5 text-icon" />
      </div>

      {/* CTA */}
      <Button className="w-full justify-center gap-2">
        <LayoutGrid className="size-5" />
        Read Guide
      </Button>

      {/* primary nav */}
      <nav className="mt-3 flex flex-col gap-1">
        {primaryNav.map((entry) => (
          <NavRow key={entry.label} {...entry} />
        ))}
      </nav>

      {/* pages */}
      <SectionLabel>Pages</SectionLabel>
      <nav className="flex flex-col gap-1">
        {pagesNav.map((entry) => (
          <NavRow key={entry.label} {...entry} />
        ))}
      </nav>

      {/* tags */}
      <SectionLabel>Tags</SectionLabel>
      <div className="flex flex-col gap-1">
        {tags.map((tag) => (
          <TagRow key={tag.label} label={tag.label} tone={tag.tone} />
        ))}
      </div>
    </aside>
  );
}
