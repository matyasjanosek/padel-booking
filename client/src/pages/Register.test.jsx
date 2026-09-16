import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register.jsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";

function renderRegister() {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Register", () => {
  it("renders the name, email and password fields", () => {
    useAuth.mockReturnValue({ register: vi.fn() });
    renderRegister();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("navigates to the account page after a successful registration", async () => {
    const register = vi.fn().mockResolvedValue({ id: 1 });
    useAuth.mockReturnValue({ register });
    renderRegister();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "very-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/account"));
    expect(register).toHaveBeenCalledWith({
      name: "Alex",
      email: "a@example.com",
      password: "very-secret",
    });
  });

  it("shows the server's error message when the email is already registered", async () => {
    const register = vi.fn().mockRejectedValue(new Error("Email is already registered"));
    useAuth.mockReturnValue({ register });
    renderRegister();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "very-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Email is already registered")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("links to Google sign in", () => {
    useAuth.mockReturnValue({ register: vi.fn() });
    renderRegister();
    expect(screen.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
      "href",
      "/api/auth/google",
    );
  });
});
