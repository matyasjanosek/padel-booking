import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Info from "./Info.jsx";

describe("Info", () => {
  it("renders the page heading and the sections", () => {
    render(<Info />);
    expect(screen.getByRole("heading", { level: 1, name: "Info" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Opening hours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Prices" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to find us" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Court rules" })).toBeInTheDocument();
  });
});
