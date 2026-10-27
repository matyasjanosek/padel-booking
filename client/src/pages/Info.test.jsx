import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Info from "./Info.jsx";

describe("Info", () => {
  it("renders the page heading and the sections", () => {
    render(<Info />);
    expect(screen.getByRole("heading", { level: 1, name: "INFO" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Opening hours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Price" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to find us" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Court rules" })).toBeInTheDocument();
  });

  it("shows the club is open 24/7", () => {
    render(<Info />);
    expect(screen.getByText("24/7")).toBeInTheDocument();
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

  it("shows the map embed and the real address", () => {
    render(<Info />);
    const map = screen.getByTitle("Map showing GEN PADEL Rožnov");
    expect(map.tagName).toBe("IFRAME");
    expect(map).toHaveAttribute("loading", "lazy");
    expect(screen.getByText(/Pod strání 2268/)).toBeInTheDocument();
  });
});
