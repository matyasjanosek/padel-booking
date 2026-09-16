import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Account from "./Account.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";

describe("Account", () => {
  it("shows the logged in user's name and email", () => {
    useAuth.mockReturnValue({ user: { name: "Alex", email: "alex@example.com" } });
    render(<Account />);
    expect(screen.getByRole("heading", { level: 1, name: "Account" })).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
  });
});
