# web

FE-001: operator dashboard, Next.js 15 App Router. Currently: MapLibre GL base map + a real layer-toggle system (`src/components/base-map.tsx`). FE-002 (Socket.io entity rendering) and FE-003 (sensor health panel) aren't built yet — this covers FE-001 only.

## PMTiles

Set `NEXT_PUBLIC_PMTILES_URL` to a `map-tile-server` (SVC-006) archive URL to render VEKTOR's own map packs through the `pmtiles://` protocol. Without it, the map falls back to MapLibre's public demo style, so `pnpm dev` renders something before any EDGE-004 map pack exists.

```bash
# .env.local
NEXT_PUBLIC_PMTILES_URL=http://localhost:3006/tiles/area.pmtiles
```

## Target Workbench / decision support

`/target-workbench` and `/settings` talk to `coa-svc`'s role-gated REST API (threat
ranking, RAG-grounded COA generation, commander approve/reject) — `coa-svc` requires
a valid JWT (`vektor-backend/packages/auth`), and this app has no real login flow yet
(the intended path is Keycloak SSO, `vektor-infra/terraform/modules/gateway`, not a
local-dev-loop fit). For local development, run the **dev-only** auth bridge instead:

```bash
# from vektor-backend/
pnpm --filter @vektor/auth dev:auth-bridge   # http://localhost:4477

# point coa-svc at it (its .env / shell):
KEYCLOAK_JWKS_URI=http://localhost:4477/certs
```

Then open `/settings` in the app, pick a role, and click "Mint via dev bridge" — it
fetches a token straight from the bridge and stores it in `localStorage`. Never point
`KEYCLOAK_JWKS_URI` at this bridge outside local development.

```bash
# .env.local
NEXT_PUBLIC_COA_SVC_URL=http://localhost:3010
NEXT_PUBLIC_DEV_AUTH_BRIDGE_URL=http://localhost:4477
```

## Local development

```bash
pnpm dev     # http://localhost:3000 (or the next free port)
pnpm build
pnpm lint    # eslint + tsc --noEmit
```
