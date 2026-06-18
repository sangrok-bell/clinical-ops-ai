import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>panel content</Card>);
    expect(screen.getByText("panel content")).toBeInTheDocument();
  });

  it("is an elevated surface with the card radius", () => {
    const { container } = render(<Card>x</Card>);
    const el = container.firstElementChild!;
    expect(el).toHaveClass("bg-surface");
    expect(el).toHaveClass("rounded-card");
  });

  it("merges a custom className", () => {
    const { container } = render(<Card className="p-2">x</Card>);
    expect(container.firstElementChild).toHaveClass("p-2");
  });
});
