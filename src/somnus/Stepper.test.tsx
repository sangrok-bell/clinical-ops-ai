import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stepper } from "@/somnus/Stepper";
import { STEPS } from "@/somnus/steps";

describe("Stepper", () => {
  it("renders all 6 step labels", () => {
    render(<Stepper steps={STEPS} currentId="protocol" statusOf={() => "available"} onSelect={() => {}} />);
    for (const s of STEPS) expect(screen.getByText(s.label)).toBeInTheDocument();
  });

  it("marks the current step with aria-current=step", () => {
    render(<Stepper steps={STEPS} currentId="collect" statusOf={() => "available"} onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /데이터 수집/ })).toHaveAttribute("aria-current", "step");
  });

  it("calls onSelect when a step is clicked", async () => {
    const onSelect = vi.fn();
    render(<Stepper steps={STEPS} currentId="protocol" statusOf={() => "available"} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /모니터링/ }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
