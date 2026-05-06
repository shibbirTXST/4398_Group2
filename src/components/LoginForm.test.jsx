import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import LoginForm from "./LoginForm";

// Mock supabase
vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

import { supabase } from "../supabaseClient";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>
  );

describe("Login Form", () => {

  test("successful login", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "Password1!");
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password1!",
      })
    );
  });

  test("empty fields show error", async () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(screen.getByText("Both fields are required")).toBeInTheDocument();
  });

  test("invalid login shows supabase error", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: "Invalid login credentials" },
    });

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText("Email"), "wrong@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "wrongpass");
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument()
    );
  });

});