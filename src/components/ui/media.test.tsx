import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar, Thumbnail } from "@/components/ui/media";

describe("Avatar", () => {
  it("falls back to the uppercased initial with an accessible label", () => {
    render(<Avatar name="mike" />);
    const el = screen.getByLabelText("mike");
    expect(el).toHaveTextContent("M");
  });

  it("renders an <img> when src is provided", () => {
    render(<Avatar name="Jess" src="https://example.com/j.png" />);
    const img = screen.getByRole("img", { name: "Jess" });
    expect(img).toHaveAttribute("src", "https://example.com/j.png");
  });

  it("is deterministic: same name → same gradient", () => {
    const { container: c1 } = render(<Avatar name="Mike" />);
    const { container: c2 } = render(<Avatar name="Mike" />);
    const a = c1.querySelector("[aria-label='Mike']")?.getAttribute("style");
    const b = c2.querySelector("[aria-label='Mike']")?.getAttribute("style");
    expect(a).toBe(b);
    expect(a).toContain("linear-gradient");
  });
});

describe("Thumbnail", () => {
  it("renders a decorative gradient block by default", () => {
    const { container } = render(<Thumbnail seed="backpack" />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute("aria-hidden");
    expect(el.tagName).toBe("DIV");
  });

  it("renders an <img> when src is provided", () => {
    const { container } = render(<Thumbnail seed="x" src="https://example.com/t.png" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/t.png");
  });
});
