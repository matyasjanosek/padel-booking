import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer.jsx";

describe("Footer", () => {
  it("shows both opening hours, the address, and the contact email", () => {
    render(<Footer />);
    expect(screen.getByText("7:00–22:00")).toBeInTheDocument();
    expect(screen.getByText("8:00–20:00")).toBeInTheDocument();
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

  it("credits the ball model's title, author and licence, each linked, and says it was modified", () => {
    render(<Footer />);

    expect(screen.getByText(/simplified for the web/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: '"Tennis Ball"' })).toHaveAttribute(
      "href",
      "https://sketchfab.com/3d-models/tennis-ball-8f1cbc19dc414ad89097eabe063ada88",
    );
    expect(screen.getByRole("link", { name: "Arman.Abgaryan" })).toHaveAttribute(
      "href",
      "https://sketchfab.com/Arman.Abgaryan",
    );
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute(
      "href",
      "http://creativecommons.org/licenses/by/4.0/",
    );
  });
});
