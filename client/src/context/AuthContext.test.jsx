import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext.jsx";

vi.mock("../api/auth.js", () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

import { fetchMe, login, register, logout } from "../api/auth.js";

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p>loading: {String(auth.loading)}</p>
      <p>user: {auth.user ? auth.user.email : "none"}</p>
      <button onClick={() => auth.login({ email: "a@example.com", password: "secret123" })}>
        log in
      </button>
      <button
        onClick={() => auth.register({ email: "a@example.com", password: "secret123", name: "A" })}
      >
        sign up
      </button>
      <button onClick={() => auth.logout()}>log out</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("loads the current user on mount", async () => {
    fetchMe.mockResolvedValue({ id: 1, email: "member@example.com" });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByText("loading: true")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());
    expect(screen.getByText("user: member@example.com")).toBeInTheDocument();
  });

  it("has no user when fetchMe resolves to null", async () => {
    fetchMe.mockResolvedValue(null);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());
    expect(screen.getByText("user: none")).toBeInTheDocument();
  });

  it("sets the user after login", async () => {
    fetchMe.mockResolvedValue(null);
    login.mockResolvedValue({ id: 1, email: "a@example.com" });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());

    screen.getByText("log in").click();

    await waitFor(() => expect(screen.getByText("user: a@example.com")).toBeInTheDocument());
  });

  it("sets the user after register", async () => {
    fetchMe.mockResolvedValue(null);
    register.mockResolvedValue({ id: 2, email: "a@example.com" });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());

    screen.getByText("sign up").click();

    await waitFor(() => expect(screen.getByText("user: a@example.com")).toBeInTheDocument());
  });

  it("clears the user after logout", async () => {
    fetchMe.mockResolvedValue({ id: 1, email: "member@example.com" });
    logout.mockResolvedValue();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("user: member@example.com")).toBeInTheDocument());

    screen.getByText("log out").click();

    await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
  });
});
