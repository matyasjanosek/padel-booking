import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer.jsx";

describe("Footer", () => {
  it("shows the opening hours, the address, and the contact email", () => {
    render(<Footer />);
    expect(screen.getByText("24/7")).toBeInTheDocument();
    expect(screen.getByText("Pod strání 2268")).toBeInTheDocument();
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
