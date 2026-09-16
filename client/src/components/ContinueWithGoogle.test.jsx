import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContinueWithGoogle from "./ContinueWithGoogle.jsx";

describe("ContinueWithGoogle", () => {
  it("links to the server's Google login route", () => {
    render(<ContinueWithGoogle />);
    const link = screen.getByRole("link", { name: "Continue with Google" });
    expect(link).toHaveAttribute("href", "/api/auth/google");
  });
});
