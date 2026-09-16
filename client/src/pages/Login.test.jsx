import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login.jsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";

function renderLogin(initialEntries = ["/login"]) {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Login />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Login", () => {
  it("renders the email and password fields", () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    renderLogin();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("navigates to the account page after a successful login", async () => {
    const login = vi.fn().mockResolvedValue({ id: 1 });
    useAuth.mockReturnValue({ login });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/account"));
    expect(login).toHaveBeenCalledWith({ email: "a@example.com", password: "correct-password" });
  });

  it("shows the server's error message when login fails", async () => {
    const login = vi.fn().mockRejectedValue(new Error("Invalid email or password"));
    useAuth.mockReturnValue({ login });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("links to Google sign in", () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    renderLogin();
    expect(screen.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
      "href",
      "/api/auth/google",
    );
  });

  it("shows an error when redirected back from a failed Google sign in", () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    renderLogin(["/login?error=google"]);
    expect(screen.getByText(/something went wrong signing in with google/i)).toBeInTheDocument();
  });
});
