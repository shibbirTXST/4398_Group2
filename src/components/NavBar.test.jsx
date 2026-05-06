import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import NavBar from "./NavBar";
import { searchAnime } from "../services/jikanApi";

vi.mock("../services/jikanApi", () => ({
    searchAnime: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderNavBar = () =>
    render(
        <MemoryRouter>
            <NavBar />
        </MemoryRouter>
    );

describe("NavBar Global Search", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("Verify Search Autocomplete Dropdown", async () => {
        searchAnime.mockResolvedValue([
            { mal_id: 1, title: "Naruto", images: { jpg: { image_url: "url" } } }
        ]);
        renderNavBar();

        const searchInput = screen.getByPlaceholderText("Search anime...");
        await userEvent.type(searchInput, "Naruto");

        await waitFor(() => {
            expect(searchAnime).toHaveBeenCalledWith("Naruto");
            expect(screen.getByText("Naruto")).toBeInTheDocument();
        });
    });

    test("Verify Navigation from Autocomplete Dropdown", async () => {
        searchAnime.mockResolvedValue([
            { mal_id: 2, title: "Bleach", images: { jpg: { image_url: "url" } } }
        ]);
        renderNavBar();

        const searchInput = screen.getByPlaceholderText("Search anime...");
        await userEvent.type(searchInput, "Bleach");

        await waitFor(() => {
            expect(screen.getByText("Bleach")).toBeInTheDocument();
        });

        const animeLink = screen.getByText("Bleach");
        fireEvent.click(animeLink);

        await waitFor(() => {
            expect(searchInput.value).toBe("");
            expect(screen.queryByText("Bleach")).not.toBeInTheDocument();
        });
    });

    test("Verify Full Search Results Page Submission", async () => {
        searchAnime.mockResolvedValue([]);
        renderNavBar();

        const searchInput = screen.getByPlaceholderText("Search anime...");
        await userEvent.type(searchInput, "Attack on Titan");

        fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

        expect(mockNavigate).toHaveBeenCalledWith("/search?q=Attack%20on%20Titan");
        expect(searchInput.value).toBe("");
    });

    test("Verify Empty Search Submission Prevention", async () => {
        renderNavBar();

        const searchInput = screen.getByPlaceholderText("Search anime...");
        expect(searchInput.value).toBe("");

        fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(searchAnime).not.toHaveBeenCalled();
    });
});
