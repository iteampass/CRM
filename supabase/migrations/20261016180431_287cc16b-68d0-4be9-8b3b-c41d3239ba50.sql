alter function realestate.set_updated_at() set search_path = '';

create or replace function realestate.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;