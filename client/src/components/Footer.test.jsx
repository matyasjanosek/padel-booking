import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer.jsx";

describe("Footer", () => {
  it("shows both opening hours, the address, and the contact email", () => {
    render(<Footer />);
    expect(screen.getByText("7:00–22:00")).toBeInTheDocument();
    expect(screen.getByText("8:00–20:00")).toBeInTheDocument();
    expect(screen.getByText("Sportovní 12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "info@genpadel.cz" })).toHaveAttribute(
      "href",
      "mailto:info@genpadel.cz",
    );
  });

  it("shows the legal line with the current year", () => {
    render(<Footer />);
    expect(screen.getByText(`© ${new Date().getFullYear()} GEN PADEL Rožnov`)).toBeInTheDocument();
  });
});
