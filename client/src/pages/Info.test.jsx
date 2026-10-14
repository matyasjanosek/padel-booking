import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Info from "./Info.jsx";

describe("Info", () => {
  it("renders the page heading and the sections", () => {
    render(<Info />);
    expect(screen.getByRole("heading", { level: 1, name: "Info" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Opening hours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Price" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to find us" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Court rules" })).toBeInTheDocument();
  });

  it("shows both opening hours, weekday and weekend", () => {
    render(<Info />);
    expect(screen.getByText("7:00–22:00")).toBeInTheDocument();
    expect(screen.getByText("8:00–20:00")).toBeInTheDocument();
  });

  it("shows the price as a number", () => {
    render(<Info />);
    expect(screen.getByText("400")).toBeInTheDocument();
    expect(screen.getByText("CZK")).toBeInTheDocument();
  });

  it("shows the rackets photo with real alt text, sized to prevent layout shift, lazy loaded", () => {
    render(<Info />);
    const photo = screen.getByRole("img", { name: /rackets/i });
    expect(photo).toHaveAttribute("width", "547");
    expect(photo).toHaveAttribute("height", "365");
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo.alt).not.toMatch(/padel court photo/i);
  });

  it("shows the site plan with an accessible description", () => {
    render(<Info />);
    expect(screen.getByRole("img", { name: /site plan.*two courts.*gate/i })).toBeInTheDocument();
  });
});
