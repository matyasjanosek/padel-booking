import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminUsers from "./AdminUsers.jsx";

vi.mock("../api/adminUsers.js", () => ({
  fetchAdminUsers: vi.fn(),
  changeUserRole: vi.fn(),
}));
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { fetchAdminUsers, changeUserRole } from "../api/adminUsers.js";
import { useAuth } from "../context/AuthContext.jsx";

const self = { id: 1, email: "me@example.com", name: "Me", role: "admin" };
const otherMember = { id: 2, email: "sam@example.com", name: "Sam", role: "member" };

function renderPage() {
  render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { id: 1, role: "admin" } });
});

describe("AdminUsers", () => {
  it("shows a loading message while the users have not arrived yet", () => {
    fetchAdminUsers.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  it("shows an error when the users could not be loaded", async () => {
    fetchAdminUsers.mockRejectedValue(new Error("Could not load users"));
    renderPage();

    expect(await screen.findByText("Could not load users")).toBeInTheDocument();
  });

  it("shows each user's name, email and role", async () => {
    fetchAdminUsers.mockResolvedValue([self, otherMember]);
    renderPage();

    const rows = await screen.findAllByRole("row");
    expect(within(rows[2]).getByText("Sam")).toBeInTheDocument();
    expect(within(rows[2]).getByText("sam@example.com")).toBeInTheDocument();
  });

  it("gives the current admin no role control for their own row", async () => {
    fetchAdminUsers.mockResolvedValue([self, otherMember]);
    renderPage();

    const rows = await screen.findAllByRole("row");
    const ownRow = rows[1];
    expect(within(ownRow).getByText("Admin")).toBeInTheDocument();
    expect(within(ownRow).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(ownRow).getByText(/cannot change your own role/i)).toBeInTheDocument();
  });

  it("does not save on selecting a new role, only arms a Save button", async () => {
    fetchAdminUsers.mockResolvedValue([self, otherMember]);
    renderPage();

    const rows = await screen.findAllByRole("row");
    const otherRow = rows[2];
    expect(within(otherRow).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();

    fireEvent.change(within(otherRow).getByRole("combobox"), { target: { value: "admin" } });

    expect(within(otherRow).getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(changeUserRole).not.toHaveBeenCalled();
  });

  it("saves the new role once Save is clicked", async () => {
    fetchAdminUsers.mockResolvedValue([self, otherMember]);
    changeUserRole.mockResolvedValue({ ...otherMember, role: "admin" });
    renderPage();

    const rows = await screen.findAllByRole("row");
    const otherRow = rows[2];
    fireEvent.change(within(otherRow).getByRole("combobox"), { target: { value: "admin" } });
    fireEvent.click(within(otherRow).getByRole("button", { name: "Save" }));

    expect(changeUserRole).toHaveBeenCalledWith(2, "admin");
    expect(await within(otherRow).findByRole("combobox")).toHaveValue("admin");
    expect(within(otherRow).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("shows an error when the role change fails", async () => {
    fetchAdminUsers.mockResolvedValue([self, otherMember]);
    changeUserRole.mockRejectedValue(new Error("You cannot remove your own admin role"));
    renderPage();

    const rows = await screen.findAllByRole("row");
    const otherRow = rows[2];
    fireEvent.change(within(otherRow).getByRole("combobox"), { target: { value: "admin" } });
    fireEvent.click(within(otherRow).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("You cannot remove your own admin role")).toBeInTheDocument();
  });
});
