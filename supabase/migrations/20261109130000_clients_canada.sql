-- =============================================================================
-- Clients: Canadian defaults + structured location for sales tax
--
-- GST/HST on services follows the CLIENT's location (place of supply), so the
-- country and province must be machine-readable:
--   * country  → country_code (ISO 3166-1 alpha-2), default 'CA'
--   * region   → for Canadian clients, the 2-letter province/territory code
-- Safe to restructure: no client rows exist yet when this ships.
-- =============================================================================

alter table public.clients alter column currency set default 'CAD';

alter table public.clients drop column country;
alter table public.clients
  add column country_code text not null default 'CA' check (country_code ~ '^[A-Z]{2}$');

alter table public.clients
  add constraint clients_ca_region_is_province check (
    country_code <> 'CA'
    or region is null
    or region in ('AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT')
  );
