import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCoupons from "./AdminCoupons.jsx";

vi.mock("../api/adminCoupons.js", () => ({
  fetchAdminCoupons: vi.fn(),
  createCoupon: vi.fn(),
  setCouponActive: vi.fn(),
}));

import { fetchAdminCoupons, createCoupon, setCouponActive } from "../api/adminCoupons.js";

const activeCoupon = {
  id: 1,
  code: "SUMMER10",
  discountType: "percentage",
  discountValue: 10,
  validFrom: "2030-01-01T00:00:00.000Z",
  validUntil: "2030-12-31T00:00:00.000Z",
  maxUses: 50,
  timesUsed: 3,
  isActive: true,
};

function renderPage() {
  render(
    <MemoryRouter>
      <AdminCoupons />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminCoupons", () => {
  it("shows a loading message while the coupons have not arrived yet", () => {
    fetchAdminCoupons.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/loading coupons/i)).toBeInTheDocument();
  });

  it("shows an error when the coupons could not be loaded", async () => {
    fetchAdminCoupons.mockRejectedValue(new Error("Could not load coupons"));
    renderPage();

    expect(await screen.findByText("Could not load coupons")).toBeInTheDocument();
  });

  it("shows each coupon's code, discount, usage and status", async () => {
    fetchAdminCoupons.mockResolvedValue([activeCoupon]);
    renderPage();

    const row = (await screen.findAllByRole("row"))[1];
    expect(within(row).getByText("SUMMER10")).toBeInTheDocument();
    expect(within(row).getByText("10%")).toBeInTheDocument();
    expect(within(row).getByText("3 / 50")).toBeInTheDocument();
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
  });

  it("shows a Reactivate button for an already inactive coupon", async () => {
    fetchAdminCoupons.mockResolvedValue([{ ...activeCoupon, isActive: false }]);
    renderPage();

    const row = (await screen.findAllByRole("row"))[1];
    expect(within(row).getByText("Inactive")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Reactivate" })).toBeInTheDocument();
  });

  it("creates a coupon from the form", async () => {
    fetchAdminCoupons.mockResolvedValue([]);
    const created = { ...activeCoupon, id: 2, code: "WINTER20" };
    createCoupon.mockResolvedValue(created);
    renderPage();

    fireEvent.change(await screen.findByLabelText("Code"), { target: { value: "WINTER20" } });
    fireEvent.change(screen.getByLabelText("Discount value"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Usage limit"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Valid from"), {
      target: { value: "2030-01-01T00:00" },
    });
    fireEvent.change(screen.getByLabelText("Valid until"), {
      target: { value: "2030-02-01T00:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create coupon" }));

    expect(await screen.findByText("WINTER20")).toBeInTheDocument();
    expect(createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "WINTER20",
        discountType: "percentage",
        discountValue: "20",
        maxUses: "10",
      }),
    );
  });

  it("shows the server's error when creating a coupon fails", async () => {
    fetchAdminCoupons.mockResolvedValue([]);
    createCoupon.mockRejectedValue(new Error("A coupon with that code already exists"));
    renderPage();

    fireEvent.change(await screen.findByLabelText("Code"), { target: { value: "SUMMER10" } });
    fireEvent.change(screen.getByLabelText("Discount value"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Usage limit"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Valid from"), {
      target: { value: "2030-01-01T00:00" },
    });
    fireEvent.change(screen.getByLabelText("Valid until"), {
      target: { value: "2030-12-31T00:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create coupon" }));

    expect(await screen.findByText("A coupon with that code already exists")).toBeInTheDocument();
  });

  it("deactivates a coupon", async () => {
    fetchAdminCoupons.mockResolvedValue([activeCoupon]);
    setCouponActive.mockResolvedValue({ ...activeCoupon, isActive: false });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Inactive")).toBeInTheDocument();
    expect(setCouponActive).toHaveBeenCalledWith(1, false);
  });

  it("reactivates a coupon", async () => {
    fetchAdminCoupons.mockResolvedValue([{ ...activeCoupon, isActive: false }]);
    setCouponActive.mockResolvedValue({ ...activeCoupon, isActive: true });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reactivate" }));

    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(setCouponActive).toHaveBeenCalledWith(1, true);
  });
});
