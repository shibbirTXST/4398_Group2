import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Signup from "./Signup";

// Mock supabase
vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}));

import { supabase } from "../supabaseClient";

const renderSignup = () =>
  render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  );

describe("Signup Form", () => {
  beforeEach(() => {
    window.alert = vi.fn();
  });

  test("successful sign up with valid credentials", async () => {
    supabase.auth.signUp.mockResolvedValue({ error: null });
    renderSignup();

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "Password1!");
    await userEvent.type(screen.getByPlaceholderText("Confirm Password"), "Password1!");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Password1!",
      options: { data: { username: "testuser" } },
    }));
  });

  test("mismatched passwords shows correct error", async () => {
    renderSignup();

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "Password1!");
    await userEvent.type(screen.getByPlaceholderText("Confirm Password"), "different123");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("duplicate email shows correct error", async () => {
    supabase.auth.signUp.mockResolvedValue({ error: { message: "User already registered" } });
    renderSignup();

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Email"), "existing@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "Password1!");
    await userEvent.type(screen.getByPlaceholderText("Confirm Password"), "Password1!");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByText("User already registered")).toBeInTheDocument()
    );
  });

  test("empty required fields shows error", async () => {
    renderSignup();
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(screen.getByText("All fields are required")).toBeInTheDocument();
  });

  test("whitespace treated as empty", async () => {
    renderSignup();

    await userEvent.type(screen.getByPlaceholderText("Username"), "   ");
    await userEvent.type(screen.getByPlaceholderText("Email"), "   ");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(screen.getByText("All fields are required")).toBeInTheDocument();
  });

  test("weak password shows requirements error", async () => {
    renderSignup();

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "abc");
    await userEvent.type(screen.getByPlaceholderText("Confirm Password"), "abc");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  test("invalid email formats are rejected", async () => {
    renderSignup();

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Email"), "notanemail");
    await userEvent.type(screen.getByPlaceholderText("Password"), "Password1!");
    await userEvent.type(screen.getByPlaceholderText("Confirm Password"), "Password1!");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
  });

  test("valid email formats are accepted", async () => {
    supabase.auth.signUp.mockResolvedValue({ error: null });
    renderSignup();

    await userEvent.type(screen.getByPlaceholderText("Username"), "testuser");
    await userEvent.type(screen.getByPlaceholderText("Email"), "user+tag@sub.domain.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "Password1!");
    await userEvent.type(screen.getByPlaceholderText("Confirm Password"), "Password1!");
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalled());
  });

});
