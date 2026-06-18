import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Folder } from "lucide-react";
import { NavItem, SectionLabel, Tab, IconButton } from "@/components/ui/nav";

describe("NavItem", () => {
  it("renders its label", () => {
    render(<NavItem icon={Folder} label="Tasks" />);
    expect(screen.getByRole("button", { name: /Tasks/ })).toBeInTheDocument();
  });

  it("renders a count pill when count is set", () => {
    render(<NavItem icon={Folder} label="Tasks" count={25} />);
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("marks the active row with aria-current", () => {
    render(<NavItem icon={Folder} label="Tasks" active />);
    expect(screen.getByRole("button", { name: /Tasks/ })).toHaveAttribute("aria-current", "page");
  });

  it("is not aria-current when inactive", () => {
    render(<NavItem icon={Folder} label="Teams" />);
    expect(screen.getByRole("button", { name: /Teams/ })).not.toHaveAttribute("aria-current");
  });

  it("danger tone count gets the urgent ring (non-color cue)", () => {
    render(<NavItem icon={Folder} label="Alerts" count={9} tone="danger" />);
    expect(screen.getByText("9")).toHaveClass("ring-2");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<NavItem icon={Folder} label="Tasks" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: /Tasks/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("SectionLabel", () => {
  it("renders its text", () => {
    render(<SectionLabel>Pages</SectionLabel>);
    expect(screen.getByText("Pages")).toBeInTheDocument();
  });
});

describe("Tab", () => {
  it("emphasizes the active tab (semibold)", () => {
    render(<Tab active>History</Tab>);
    expect(screen.getByRole("button", { name: "History" })).toHaveClass("font-semibold");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Tab onClick={onClick}>Design Tips</Tab>);
    await userEvent.click(screen.getByRole("button", { name: "Design Tips" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("IconButton", () => {
  it("renders an icon with an accessible label", () => {
    render(<IconButton icon={Folder} aria-label="Files" />);
    const btn = screen.getByRole("button", { name: "Files" });
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("adds the glass surface when glassy", () => {
    render(<IconButton icon={Folder} glassy aria-label="Files" />);
    expect(screen.getByRole("button", { name: "Files" })).toHaveClass("glass");
  });

  it("renders overlay children (e.g. badges)", () => {
    render(
      <IconButton icon={Folder} aria-label="Uploads">
        <span>9</span>
      </IconButton>,
    );
    expect(screen.getByText("9")).toBeInTheDocument();
  });
});
