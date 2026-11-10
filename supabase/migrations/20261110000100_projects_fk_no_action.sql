-- projects → clients: RESTRICT is checked immediately, even mid-cascade, so deleting
-- an auth user (which cascades to both clients and projects) could fail.
-- NO ACTION still blocks deleting a client that has projects, but is checked at the
-- end of the statement, so a cascade that removes both succeeds.
alter table public.projects drop constraint projects_client_same_owner;
alter table public.projects
  add constraint projects_client_same_owner
    foreign key (client_id, owner_id) references public.clients (id, owner_id) on delete no action;
