import {
  Lightbulb,
  CircleUser,
  LayoutGrid,
  Folder,
  Users,
  CalendarDays,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { PillTone, TagTone } from "@/types";

// Re-export design enums consumed by the Aurora feature components.
export type { PillTone, TagTone } from "@/types";

export type NavEntry = {
  icon: LucideIcon;
  label: string;
  count?: number;
  tone?: PillTone;
  active?: boolean;
};

export type HistoryItem = {
  actor: string;
  time: string;
  verb: string;
  primary: string;
  connector: string;
  secondary: string;
  trailing: { type: "thumb"; seed: string } | { type: "avatar"; name: string };
};

export const primaryNav: NavEntry[] = [
  { icon: Lightbulb, label: "Activity", count: 12, tone: "positive" },
  { icon: CircleUser, label: "My profile" },
];

export const pagesNav: NavEntry[] = [
  { icon: LayoutGrid, label: "Dashboard" },
  { icon: Folder, label: "Tasks", count: 25, tone: "positive", active: true },
  { icon: Users, label: "Teams" },
  { icon: CalendarDays, label: "Calendar" },
  { icon: MessageSquare, label: "Messages", count: 3, tone: "magenta" },
];

export const tags: { label: string; tone: TagTone }[] = [
  { label: "High Priority", tone: "danger" },
  { label: "Medium Priority", tone: "warning" },
  { label: "Low Priority", tone: "caution" },
  { label: "On Standby", tone: "positive" },
];

export const history: HistoryItem[] = [
  {
    actor: "Mike",
    time: "2h ago",
    verb: "Add",
    primary: "Backpack.img",
    connector: "to",
    secondary: "Files",
    trailing: { type: "thumb", seed: "backpack" },
  },
  {
    actor: "Lily",
    time: "2h ago",
    verb: "Assigned",
    primary: "Homepage design",
    connector: "to",
    secondary: "Jess",
    trailing: { type: "avatar", name: "Jess" },
  },
  {
    actor: "Helen",
    time: "3h ago",
    verb: "Assigned",
    primary: "Social page",
    connector: "to",
    secondary: "Derek",
    trailing: { type: "avatar", name: "Derek" },
  },
  {
    actor: "Mike",
    time: "4h ago",
    verb: "Add",
    primary: "GraphicPack",
    connector: "to",
    secondary: "Files",
    trailing: { type: "thumb", seed: "graphicpack" },
  },
  {
    actor: "Tom",
    time: "5h ago",
    verb: "Assigned",
    primary: "UI",
    connector: "to",
    secondary: "Henry",
    trailing: { type: "avatar", name: "Henry" },
  },
];
