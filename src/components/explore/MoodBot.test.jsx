import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import MoodBot from "./MoodBot";

// Mock the AI service
vi.mock("../../services/aiService", () => ({
  getGenresFromMood: vi.fn(),
}));

import { getGenresFromMood } from "../../services/aiService";

// Mock Headless UI Dialog to render its children directly without portaling/transitions for easier testing
vi.mock("@headlessui/react", async () => {
  const actual = await vi.importActual("@headlessui/react");
  return {
    ...actual,
    Dialog: ({ children, open, onClose }) => (open ? <div data-testid="dialog">{children}</div> : null),
    DialogPanel: ({ children }) => <div>{children}</div>,
    DialogTitle: ({ children }) => <h2>{children}</h2>,
    DialogBackdrop: () => <div />,
    TransitionChild: ({ children }) => <div>{children}</div>,
  };
});

describe("MoodBot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  const renderMoodBot = () =>
    render(
      <MemoryRouter>
        <MoodBot />
      </MemoryRouter>
    );

  test("Successfully open the MoodBot side panel", () => {
    renderMoodBot();
    
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    
    fireEvent.click(screen.getByRole("button", { name: /MoodBot/i }));
    
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("Hi! I'm MoodBot. Tell me what kind of mood you're in and I'll recommend some anime!")).toBeInTheDocument();
  });

  test("Successfully close the MoodBot side panel", () => {
    renderMoodBot();
    
    fireEvent.click(screen.getByRole("button", { name: /MoodBot/i }));
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole("button", { name: /Close panel/i }));
    
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  test("Input field prevents submission when empty", async () => {
    renderMoodBot();
    fireEvent.click(screen.getByRole("button", { name: /MoodBot/i }));
    
    const sendButton = screen.getByRole("button", { name: /Send/i });
    fireEvent.click(sendButton);
    
    expect(getGenresFromMood).not.toHaveBeenCalled();
  });

  test("Chat bubbles correctly format messages as 'User' and 'Assistant'", async () => {
    getGenresFromMood.mockResolvedValue({
      friendly_message: "Here you go!",
      genres: [1]
    });
    
    global.fetch.mockResolvedValue({
      json: async () => ({ data: [] })
    });

    renderMoodBot();
    fireEvent.click(screen.getByRole("button", { name: /MoodBot/i }));
    
    const input = screen.getByPlaceholderText("Type your mood...");
    fireEvent.change(input, { target: { value: "I am feeling happy" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));
    
    expect(screen.getByText("I am feeling happy")).toBeInTheDocument();
    expect(screen.getByText("I am feeling happy")).toHaveClass("bg-purple-600");
    
    expect(screen.getByText(/Hi! I'm MoodBot/i)).toHaveClass("bg-slate-800");
  });

  test("User message correctly triggers a secure call to the AI service API", async () => {
    getGenresFromMood.mockResolvedValue({
      friendly_message: "Let's find something",
      genres: [1]
    });
    
    global.fetch.mockResolvedValue({
      json: async () => ({ data: [] })
    });

    renderMoodBot();
    fireEvent.click(screen.getByRole("button", { name: /MoodBot/i }));
    
    const input = screen.getByPlaceholderText("Type your mood...");
    fireEvent.change(input, { target: { value: "I need action" } });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));
    
    expect(getGenresFromMood).toHaveBeenCalledWith("I need action");
  });

  test("Successfully parse AI response and map to existing anime data", async () => {
    getGenresFromMood.mockResolvedValue({
      friendly_message: "I found some action anime!",
      genres: [1]
    });
    
    global.fetch.mockResolvedValue({
      json: async () => ({
        data: [
          { title_english: "Naruto" },
          { title: "One Piece" }
        ]
      })
    });

    renderMoodBot();
    fireEvent.click(screen.getByRole("button", { name: /MoodBot/i }));
    
    const input = screen.getByPlaceholderText("Type your mood...");
    fireEvent.change(input, { target: { value: "action" } });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    expect(global.fetch.mock.calls[0][0]).toContain("genres=1");
  });

  test("Successfully output a mood-based anime recommendation in the chat", async () => {
    getGenresFromMood.mockResolvedValue({
      friendly_message: "Here are some recommendations!",
      genres: [1]
    });
    
    global.fetch.mockResolvedValue({
      json: async () => ({
        data: [
          { title_english: "Attack on Titan" },
          { title: "Demon Slayer" }
        ]
      })
    });

    renderMoodBot();
    fireEvent.click(screen.getByRole("button", { name: /MoodBot/i }));
    
    const input = screen.getByPlaceholderText("Type your mood...");
    fireEvent.change(input, { target: { value: "epic" } });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Attack on Titan/)).toBeInTheDocument();
      expect(screen.getByText(/Demon Slayer/)).toBeInTheDocument();
    });
  });

  test("Appropriate error message displays when AI service fails or times out", async () => {
    getGenresFromMood.mockRejectedValue(new Error("Failed to interpret your mood"));

    renderMoodBot();
    fireEvent.click(screen.getByRole("button", { name: /MoodBot/i }));
    
    const input = screen.getByPlaceholderText("Type your mood...");
    fireEvent.change(input, { target: { value: "bad request" } });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));
    
    await waitFor(() => {
      expect(screen.getByText("Sorry, I'm having trouble understanding you. Try rephrasing your request.")).toBeInTheDocument();
    });
  });
});
