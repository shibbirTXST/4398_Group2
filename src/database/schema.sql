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