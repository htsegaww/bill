-- Run this after you have signed in once through the app.
-- Replace the email and household name before executing.

with selected_user as (
  select id, email
  from auth.users
  where email = 'you@example.com'
  limit 1
), created_household as (
  insert into public.households (name, created_by)
  select 'My Household', id
  from selected_user
  returning id, created_by
)
insert into public.household_members (household_id, user_id, role)
select created_household.id, created_household.created_by, 'owner'
from created_household;