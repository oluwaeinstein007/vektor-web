<!-- GENERATED FILE — do not hand-edit. Regenerate with:
     node --experimental-strip-types scripts/generate-access-matrix.ts
     Source of truth: src/lib/nav.ts + src/lib/rbac.ts + src/lib/roles.ts -->

# Access matrix

Generated 2026-09-15T23:35:56.621Z from the same `NAV_ITEMS` / `satisfiesRequirement` code
AppTopbar and RequireRole actually run — this can't drift from what the app
does, only from having forgotten to re-run the generator after a nav change.

Settings isn't listed: it's the dev-auth bootstrap page, reachable with no
role at all, and isn't part of `NAV_ITEMS` for exactly that reason.

## By screen

| Screen | Requires | Viewer | Field Operator | Analyst | Logistics Officer | Commander | SuperAdmin |
|---|---|---|---|---|---|---|---|
| Map (`/`) | `analyst+` | — | — | ✓ | — | ✓ | ✓ |
| Target Workbench (`/target-workbench`) | `analyst+` | — | — | ✓ | — | ✓ | ✓ |
| Alerts (`/alerts`) | `all` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reports (`/reports`) | `analyst+` | — | — | ✓ | — | ✓ | ✓ |
| Logistics (`/logistics`) | `logistics+` | — | — | — | ✓ | ✓ | ✓ |
| Admin (`/admin`) | `superadmin` | — | — | — | — | — | ✓ |

## By role

### Viewer

- Alerts (`/alerts`)

### Field Operator

- Alerts (`/alerts`)

### Analyst

- Map (`/`)
- Target Workbench (`/target-workbench`)
- Alerts (`/alerts`)
- Reports (`/reports`)

### Logistics Officer

- Alerts (`/alerts`)
- Logistics (`/logistics`)

### Commander

- Map (`/`)
- Target Workbench (`/target-workbench`)
- Alerts (`/alerts`)
- Reports (`/reports`)
- Logistics (`/logistics`)

### SuperAdmin

- Map (`/`)
- Target Workbench (`/target-workbench`)
- Alerts (`/alerts`)
- Reports (`/reports`)
- Logistics (`/logistics`)
- Admin (`/admin`)
