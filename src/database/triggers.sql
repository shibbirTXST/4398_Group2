create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_anime_ratings_updated_at
before update on anime_ratings
for each row
execute function set_updated_at();

create trigger set_episode_ratings_updated_at
before update on episode_ratings
for each row
execute function set_updated_at();