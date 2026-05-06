import AnimeGrid from "../anime/AnimeGrid";

function AnimeSection({ loading, error, animeList }) {
  if (loading) {
    return <p className="text-white-500">Loading anime...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (animeList.length === 0) {
    return <p className="text-white-500">No anime found.</p>;
  }

  return <AnimeGrid animeList={animeList} />;
}

export default AnimeSection;