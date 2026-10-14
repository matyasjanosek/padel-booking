import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Contact from "./Contact.jsx";

vi.mock("../api/contact.js", () => ({
  sendContactMessage: vi.fn(),
}));

import { sendContactMessage } from "../api/contact.js";

function renderContact() {
  render(
    <MemoryRouter>
      <Contact />
    </MemoryRouter>,
  );
}

function fillForm() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello there." } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Contact", () => {
  it("renders the heading and the form fields", () => {
    renderContact();
    expect(screen.getByRole("heading", { level: 1, name: "Contact" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("renders the location details", () => {
    renderContact();
    expect(screen.getByRole("heading", { name: "Find us" })).toBeInTheDocument();
    expect(screen.getByText("info@genpadel.cz")).toBeInTheDocument();
  });

  it("sends the message and shows a success state", async () => {
    sendContactMessage.mockResolvedValue({ sent: true });
    renderContact();

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(sendContactMessage).toHaveBeenCalledWith({
      name: "Alex",
      email: "alex@example.com",
      message: "Hello there.",
    });
    expect(
      await screen.findByText("Your message has been sent. We will get back to you soon."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("shows the server's error when sending fails", async () => {
    sendContactMessage.mockRejectedValue(new Error("Too many messages. Try again later."));
    renderContact();

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Too many messages. Try again later.")).toBeInTheDocument();
    expect(screen.queryByText(/message has been sent/i)).not.toBeInTheDocument();
  });
});
