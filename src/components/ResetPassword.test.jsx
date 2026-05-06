import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import ResetPassword from "./ResetPassword";

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

import { supabase } from "../supabaseClient";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>
  );

describe("Reset Password", () => {

  test("mismatched passwords show error", async () => {
    renderPage();

    await userEvent.type(screen.getByPlaceholderText("New Password"), "Password1!");
    await userEvent.type(screen.getByPlaceholderText("Confirm New Password"), "wrong");

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("successful password update", async () => {
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    renderPage();

    await userEvent.type(screen.getByPlaceholderText("New Password"), "Password1!");
    await userEvent.type(screen.getByPlaceholderText("Confirm New Password"), "Password1!");

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() =>
      expect(supabase.auth.updateUser).toHaveBeenCalled()
    );
  });

});