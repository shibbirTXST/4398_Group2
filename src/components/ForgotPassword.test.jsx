import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import ForgotPassword from "./ForgotPassword";

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

import { supabase } from "../supabaseClient";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );

describe("Forgot Password", () => {

  test("sends reset email successfully", async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    renderPage();

    await userEvent.type(screen.getByPlaceholderText("Email"), "test@example.com");
    fireEvent.click(screen.getByRole("button", { name: /send reset email/i }));

    await waitFor(() =>
      expect(screen.getByText("Check your email for a password reset link.")).toBeInTheDocument()
    );
  });

  test("shows error if supabase fails", async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: "User not found" },
    });

    renderPage();

    await userEvent.type(screen.getByPlaceholderText("Email"), "bad@example.com");
    fireEvent.click(screen.getByRole("button", { name: /send reset email/i }));

    await waitFor(() =>
      expect(screen.getByText("User not found")).toBeInTheDocument()
    );
  });

});