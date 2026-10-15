import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Info from "./Info.jsx";

// The real ClubMap talks to Leaflet and the network; that is ClubMap's own
// test's job, not Info's. Here we only need to know Info renders it.
vi.mock("../components/ClubMap.jsx", () => ({
  default: () => <div>the map</div>,
}));

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

  it("shows the club map and the real address", async () => {
    render(<Info />);
    expect(await screen.findByText("the map")).toBeInTheDocument();
    expect(screen.getByText(/Pod strání 2268/)).toBeInTheDocument();
  });
});
