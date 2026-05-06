const genres = [
  { id: 1, name: "Action" },
  { id: 2, name: "Adventure" },
  { id: 4, name: "Comedy" },
  { id: 8, name: "Drama" },
  { id: 10, name: "Fantasy" },
  { id: 14, name: "Horror" },
  { id: 22, name: "Romance" },
  { id: 24, name: "Sci-Fi" },
  { id: 36, name: "Slice of Life" },
  { id: 37, name: "Supernatural" },
];

function ExploreControls({
  selectedGenres,
  onGenreToggle,
  onClearGenres,
  onRandomClick,
}) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => {
            const isSelected = selectedGenres.includes(String(genre.id));

            return (
              <button
                key={genre.id}
                onClick={() => onGenreToggle(genre.id)}
                className={`px-3 py-1 rounded-full border transition ${
                  isSelected
                    ? "bg-red-500 border-red-500 font-bold"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {genre.name}
              </button>
            );
          })}

          {/* Clear "X" button */}
          {selectedGenres.length > 0 && (
            <button
              onClick={onClearGenres}
              className="px-3 py-1 rounded-full border font-bold opacity-70 hover:opacity-100 transition"
              title="Clear all genres"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onRandomClick}
        className="w-fit px-4 py-2 rounded-lg border transition opacity-80 hover:opacity-100"
      >
        Surprise Me
      </button>
    </div>
  );
}

export default ExploreControls;