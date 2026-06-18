import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountPill, Dot } from "@/components/ui/badge";

describe("CountPill", () => {
  it("renders the count", () => {
    render(<CountPill>12</CountPill>);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("uses dark text on the saturated fill (AA)", () => {
    render(<CountPill>3</CountPill>);
    expect(screen.getByText("3")).toHaveClass("text-onaccent");
  });

  it("maps tone to the right fill", () => {
    render(<CountPill tone="danger">9</CountPill>);
    expect(screen.getByText("9")).toHaveClass("bg-danger");
  });

  it("adds a non-color cue (ring) when urgent (WCAG 1.4.1)", () => {
    render(
      <CountPill tone="danger" urgent>
        9
      </CountPill>,
    );
    const pill = screen.getByText("9");
    expect(pill).toHaveClass("ring-2");
  });
});

describe("Dot", () => {
  it("renders an unread indicator element", () => {
    const { container } = render(<Dot />);
    const dot = container.querySelector("span");
    expect(dot).not.toBeNull();
    expect(dot).toHaveClass("bg-magenta");
  });
});
