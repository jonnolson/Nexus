# Bonsai import (from `apps/past-content-docs/`)

Exports dated 2026-11-10: address (empty), connection, contact, expense, invoice, project,
task, timeentry. Everything is CAD.

## Done

- **Clients** (2026-11-10): 45 imported from the contact + connection exports, plus clients
  that only appear on invoices. Each client's notes say "Imported from Bonsai", list the
  other names it was billed under, other invoice emails, and its last Bonsai activity.

- **Projects** (2026-11-10): 133 of 139 imported (30 active, 103 completed), each under its
  client via the mapping below. Each project's description starts
  `Imported from Bonsai (<project_id>).` (e.g. `AVA-0145`); use that id to find a project
  again (the import skips ids already present). Also noted there: Bonsai close date, amount
  paid in Bonsai, fee/time budget, Bonsai link.
  - Bonsai `archived` → completed. `active` with no start/time/invoice since 2025-01-01 →
    completed (11 projects; noted in their description).
  - Skipped (client not imported): JON-0021, JON-0036 (Jon Nolson), KLA-0028, THE2-0098,
    SOU-0013, WHI-0057.
  - Rate: completed projects carry the latest non-zero rate from their Bonsai time entries
    (21 projects); active projects are blank → client's $120.
  - Bonsai `finish_date` is a close date (often bulk), **not** a due date: kept in the
    description, `due_date` left empty. Time budgets → `budget_minutes`. Avance's $7,200
    fee budget stays hourly (noted in description; $3,780 already paid).
  - Matching time entries / invoices to projects: Bonsai time uses `client_name` +
    `project_title`; invoices use `contractor_project_name`. Several clients have duplicate
    generic titles ("X project", "Website Hosting Plan"): match on title + client + dates.

## Owner's decisions (apply to the remaining imports too)

- **Names:** keep Bonsai's names (company = client name, person = contact name; left blank
  when it's the same as the company).
- **Skipped contacts** (not clients): `owner name` (placeholder; its project "Small Lot Web
  Updates" belongs to **Small Lots**), `The Land Guy`, `Southside Hardscaping`,
  `Klane Cawker`, `White Rabbit`.
- **Name mapping** for projects / invoices / time / tasks / expenses (Bonsai name → Nexus client):

  | Bonsai name(s) | Nexus client |
  | --- | --- |
  | Marco, Marco Pimentel, Generational Fare | Generational Fare |
  | IR Group Benefits | Irina Robertson |
  | Harry James Enterprises | Harry James |
  | Pressing Matters | Malcom Holt |
  | Peachland RV | Doug Turner |
  | HJ Group | HJgroup |
  | Gus Tangas + Tom Nolson | Gus Tangas |
  | Definitely Real, "Definitely Real " (trailing space), DRA | Definitely Real |
  | Heritage Cookbook Inc., Heritage Cookbook Inc | Heritage Cookbook Inc |
  | Pacific Sunday Tour, Pacific Sunday Golf | Pacific Sunday |
  | Common Foundry, "Common Foundry, BCASP" | Common Foundry |
  | Veronica Stark, Smartwear Revolution | their own clients |
  | owner name | Small Lots |
  | Jon Nolson | (the owner's own work: not a client; ask) |

- **Province** (drives GST vs HST): 13% HST history → ON (Equate Asset Management, Kawartha
  Custom Cut Stone, Simple Life Homes, HJgroup, EMX LTD, Gus Tangas, Harry James);
  iSMART → AB; everyone else BC.
- **Archived** if no project start, invoice or time entry since 2024-01-01. Ignore project
  `finish_date` 2024-03-14 for activity: Bonsai bulk-closed 17 projects that day.
- **Rate:** $120/h CAD for every client.

- **Invoices** (2026-11-10): 192 of 201 imported, keeping Bonsai numbers (1001–1213):
  187 paid ($341,171.63 before tax + $18,314.70 GST/HST) and 5 drafts (#1162, #1175, #1180,
  #1208, #1213). Each has one line (project name, qty 1, before-tax amount), linked to the
  project when the project belongs to the same client (159/192; aliased clients such as
  Definitely Real, Heritage Cookbook, Pacific Sunday, Common Foundry, Veronica Stark are
  unlinked because their project sits under the other client). Paid ones went
  draft → sent (`sent_at` = issue date) → paid (`paid_at` = Bonsai paid date).
  - Bonsai `total_amount` includes tax; before-tax = total − tax. Tax rate stored so Nexus
    recomputes Bonsai's tax exactly; 4 invoices (#1164, #1171, #1181, #1183) had a 1¢
    rounding difference absorbed into the before-tax amount (total exact); #1079 is 1¢
    under Bonsai ($6,056.49 vs $6,056.50).
  - #1202 and #1210 (paid, but carrying 2027 recurring dates) → issued 2026-08-28 and
    2026-02-15; due dates shifted the same. Skipped: #1009 (Jon Nolson), drafts from
    2021/2025 (#1033, #1034, #1055, #1064, #1153, #1157) and the 2027 repeats (#1196, #1209).
  - Late fee column = a configured %, never charged; ignored.
  - Numbering now continues from Bonsai: Settings prefix '' and next number 1214.

## Notes for the remaining imports (Income page depends on them)

- **Time entries:** historical Bonsai time must be marked as already billed (linked to its
  imported invoice line, or otherwise excluded), or it will all show on the Income page as
  "billable time not invoiced" in the *Coming in* notice.

## Noticed for later imports

- The Social Circle's invoices are under both `danielle@thesocialcircle.ca` and Definitely
  Real; "TSC Monthly Invoice" moved to Definitely Real from late 2024.
