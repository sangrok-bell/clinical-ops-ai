import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast } from "@/components/ui/toast";

describe("Toast", () => {
  it("renders title and message", () => {
    render(<Toast variant="success" title="Saved" message="It worked" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("It worked")).toBeInTheDocument();
  });

  it("is announced to assistive tech (role=status)", () => {
    render(<Toast variant="info" title="Heads up" message="fyi" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("marks the variant via data-variant", () => {
    const { rerender } = render(<Toast variant="success" title="t" message="m" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "success");
    rerender(<Toast variant="ghost" title="t" message="m" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "ghost");
  });

  it("calls onClose when the dismiss button is clicked", async () => {
    const onClose = vi.fn();
    render(<Toast variant="info" title="t" message="m" onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
