import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders its children as an accessible button", () => {
    render(<Button>Read Guide</Button>);
    expect(screen.getByRole("button", { name: "Read Guide" })).toBeInTheDocument();
  });

  it("defaults to the solid lime CTA variant", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-positive");
  });

  it("applies the requested variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).not.toHaveClass("bg-positive");
  });

  it("exposes a focus-visible ring (keyboard a11y)", () => {
    render(<Button>Focus</Button>);
    expect(screen.getByRole("button")).toHaveClass("focus-visible:ring-brand");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
