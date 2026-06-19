create table anime_ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id integer not null,
  rating integer not null check (rating >= 1 and rating <= 10),
  review_text text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(user_id, anime_id)
);

create table episode_ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id integer not null,
  episode_id integer not null,
  episode_number integer,
  rating integer not null check (rating >= 1 and rating <= 10),
  review_text text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(user_id, anime_id, episode_id)
);

create index idx_anime_ratings_anime_id on anime_ratings(anime_id);
create index idx_anime_ratings_user_id on anime_ratings(user_id);

create index idx_episode_ratings_anime_id on episode_ratings(anime_id);
create index idx_episode_ratings_user_id on episode_ratings(user_id);
create index idx_episode_ratings_episode_id on episode_ratings(episode_id);

-- =========================
-- anime_cache
-- Stores cached anime metadata for recommendation and display
-- =========================

create table if not exists public.anime_cache (
    mal_id bigint primary key,
    title text not null,
    title_english text,
    synopsis text,
    image_url text,
    type text,
    episodes integer,
    score numeric,
    popularity integer,
    members integer,
    year integer,
    season text,
    genres jsonb default '[]'::jsonb,
    themes jsonb default '[]'::jsonb,
    demographics jsonb default '[]'::jsonb,
    studios jsonb default '[]'::jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists anime_cache_title_idx
    on public.anime_cache using btree (title);

create index if not exists anime_cache_score_idx
    on public.anime_cache using btree (score);

create index if not exists anime_cache_popularity_idx
    on public.anime_cache using btree (popularity);


-- =========================
-- user_anime_interactions
-- Stores ratings, likes, dislikes, favorites, watch status
-- =========================

create table if not exists public.user_anime_interactions (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    mal_id bigint not null references public.anime_cache(mal_id) on delete cascade,
    rating integer check (rating between 1 and 10),
    liked boolean,
    disliked boolean,
    is_favorite boolean not null default false,
    watch_status text check (
        watch_status in ('planned', 'watching', 'completed', 'dropped', 'paused')
    ),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique (user_id, mal_id)
);

create index if not exists user_anime_interactions_user_id_idx
    on public.user_anime_interactions (user_id);

create index if not exists user_anime_interactions_mal_id_idx
    on public.user_anime_interactions (mal_id);


-- =========================
-- user_genre_preferences
-- Optional onboarding / manual preferences
-- =========================

create table if not exists public.user_genre_preferences (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    genre_name text not null,
    preference_type text not null check (preference_type in ('like', 'dislike')),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique (user_id, genre_name)
);

create index if not exists user_genre_preferences_user_id_idx
    on public.user_genre_preferences (user_id);


-- =========================
-- user_onboarding_responses
-- Stores responses to training cards
-- =========================

create table if not exists public.user_onboarding_responses (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    mal_id bigint not null references public.anime_cache(mal_id) on delete cascade,
    response text not null check (response in ('like', 'unsure', 'dislike')),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique (user_id, mal_id)
);

create index if not exists user_onboarding_responses_user_id_idx
    on public.user_onboarding_responses (user_id);


-- =========================
-- updated_at helper trigger
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_updated_at_anime_cache on public.anime_cache;
create trigger set_updated_at_anime_cache
before update on public.anime_cache
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_anime_interactions on public.user_anime_interactions;
create trigger set_updated_at_user_anime_interactions
before update on public.user_anime_interactions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_genre_preferences on public.user_genre_preferences;
create trigger set_updated_at_user_genre_preferences
before update on public.user_genre_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_onboarding_responses on public.user_onboarding_responses;
create trigger set_updated_at_user_onboarding_responses
before update on public.user_onboarding_responses
for each row execute function public.set_updated_at();