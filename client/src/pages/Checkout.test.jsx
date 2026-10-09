import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Checkout from "./Checkout.jsx";

vi.mock("../api/bookings.js", () => ({
  fetchMyBookings: vi.fn(),
}));
vi.mock("../api/courts.js", () => ({
  fetchCourts: vi.fn(),
}));
vi.mock("../api/payments.js", () => ({
  createPaymentIntent: vi.fn(),
}));
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: vi.fn(),
  useElements: vi.fn(),
}));

import { fetchMyBookings } from "../api/bookings.js";
import { fetchCourts } from "../api/courts.js";
import { createPaymentIntent } from "../api/payments.js";
import { useStripe, useElements } from "@stripe/react-stripe-js";

const pendingBooking = {
  id: 1,
  courtId: 1,
  startTime: "2030-06-10T09:00:00.000+02:00",
  endTime: "2030-06-10T10:00:00.000+02:00",
  status: "pending",
  price: 400,
};

function renderCheckout(bookingId = 1) {
  render(
    <MemoryRouter initialEntries={[`/booking/${bookingId}/checkout`]}>
      <Routes>
        <Route path="/booking/:id/checkout" element={<Checkout />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchCourts.mockResolvedValue([{ id: 1, name: "Court 1" }]);
  useStripe.mockReturnValue({ confirmPayment: vi.fn() });
  useElements.mockReturnValue({});
});

describe("Checkout", () => {
  it("shows a loading message while the booking has not arrived yet", () => {
    fetchMyBookings.mockReturnValue(new Promise(() => {}));
    renderCheckout();

    expect(screen.getByText(/loading your booking/i)).toBeInTheDocument();
  });

  it("shows an error when the booking could not be loaded", async () => {
    fetchMyBookings.mockRejectedValue(new Error("network down"));
    renderCheckout();

    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("shows a message when the booking cannot be paid for", async () => {
    fetchMyBookings.mockResolvedValue([{ ...pendingBooking, status: "cancelled" }]);
    renderCheckout();

    expect(await screen.findByText(/cannot be paid for/i)).toBeInTheDocument();
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it("shows the court, the slot and the price, and starts a payment intent", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    createPaymentIntent.mockReturnValue(new Promise(() => {}));
    renderCheckout();

    expect(
      await screen.findByText(/Court 1, Mon, 10 Jun 2030, 09:00 to 10:00/),
    ).toBeInTheDocument();
    expect(screen.getByText("400 CZK")).toBeInTheDocument();
    expect(createPaymentIntent).toHaveBeenCalledWith(1);
  });

  it("renders the payment element once the payment intent is ready", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    createPaymentIntent.mockResolvedValue({
      clientSecret: "pi_1_secret",
      publishableKey: "pk_test_example",
      amount: 400,
      currency: "czk",
    });
    renderCheckout();

    expect(await screen.findByTestId("payment-element")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay now" })).toBeInTheDocument();
  });

  it("shows a clear message instead of a broken payment form when a payment is already in progress", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    createPaymentIntent.mockRejectedValue(
      new Error(
        "A payment for this booking is already being processed. Check your account in a moment.",
      ),
    );
    renderCheckout();

    expect(await screen.findByText(/already being processed/i)).toBeInTheDocument();
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pay now" })).not.toBeInTheDocument();
  });

  it("shows the error from a declined card without redirecting", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    createPaymentIntent.mockResolvedValue({
      clientSecret: "pi_1_secret",
      publishableKey: "pk_test_example",
      amount: 400,
      currency: "czk",
    });
    const confirmPayment = vi
      .fn()
      .mockResolvedValue({ error: { message: "Your card was declined." } });
    useStripe.mockReturnValue({ confirmPayment });
    renderCheckout();

    fireEvent.click(await screen.findByRole("button", { name: "Pay now" }));

    expect(await screen.findByText("Your card was declined.")).toBeInTheDocument();
    expect(confirmPayment).toHaveBeenCalledWith({
      elements: {},
      confirmParams: { return_url: `${window.location.origin}/account` },
    });
  });

  it("calls loadStripe only once, even across separate visits to checkout", async () => {
    // A fresh module instance so this test's call count is not polluted by
    // the singleton other tests in this file have already populated.
    vi.resetModules();
    const { loadStripe: freshLoadStripe } = await import("@stripe/stripe-js");
    const { default: FreshCheckout } = await import("./Checkout.jsx");

    fetchMyBookings.mockResolvedValue([pendingBooking]);
    createPaymentIntent.mockResolvedValue({
      clientSecret: "pi_1_secret",
      publishableKey: "pk_test_example",
      amount: 400,
      currency: "czk",
    });

    function renderFresh() {
      return render(
        <MemoryRouter initialEntries={["/booking/1/checkout"]}>
          <Routes>
            <Route path="/booking/:id/checkout" element={<FreshCheckout />} />
          </Routes>
        </MemoryRouter>,
      );
    }

    const first = renderFresh();
    await screen.findByTestId("payment-element");
    first.unmount();

    renderFresh();
    await screen.findByTestId("payment-element");

    // Going back to checkout and arriving again used to create a second
    // Stripe instance, which Elements then rejected as a changed stripe prop.
    expect(freshLoadStripe).toHaveBeenCalledTimes(1);
  });

  it("links back to the account page", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    createPaymentIntent.mockReturnValue(new Promise(() => {}));
    renderCheckout();

    expect(await screen.findByRole("link", { name: "Back to your account" })).toHaveAttribute(
      "href",
      "/account",
    );
  });
});
