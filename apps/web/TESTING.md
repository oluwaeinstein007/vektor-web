# Testing the role-gated operator dashboard

This covers running `apps/web` locally with real role-based access control, using the
local dev-auth-bridge stand-in for Keycloak. Everything here is dev/local-only — the
dev-auth-bridge explicitly refuses to be anything else (see its own header comment).

## 1. Start shared dev infrastructure (once)

These are shared across services — if they're already running (check `docker ps`),
skip this step.

```bash
docker start vektor-dev-postgis vektor-dev-kafka vektor-dev-redis vektor-qdrant
```

## 2. Start the dev auth bridge

Local stand-in for Keycloak's JWKS + login. Mints role-bearing JWTs on request.

```bash
cd vektor-backend/packages/auth
pnpm build   # only needed once, or after pulling changes
node dist/dev-auth-bridge.js
# listening on http://localhost:4477
```

## 3. Build and start the backend services you want to exercise

Each service needs `KEYCLOAK_JWKS_URI` pointed at the bridge above. Build once with
`pnpm build` inside each service directory, then run with `node dist/src/index.js`
and the env vars below (adjust `DATABASE_URL`'s port/password if your local Postgres
differs — ask in your session if unsure, since this has bitten people before).

| Service | Port | Command (from the service's own directory) |
|---|---|---|
| `geospatial-svc` | 3005 | `DATABASE_URL=postgres://postgres:dev@localhost:5435/vektor KEYCLOAK_JWKS_URI=http://localhost:4477/certs PORT=3005 node dist/src/index.js` |
| `cv-inference-svc` | 3006 | `MODEL_PATH=$(pwd)/tests/fixtures/yolov8n.int8.onnx KEYCLOAK_JWKS_URI=http://localhost:4477/certs KAFKA_BROKERS=localhost:19092 PORT=3006 node dist/src/index.js` |
| `fusion-svc` | 3007 | see `services/fusion-svc/README.md` — also the Socket.io gateway the map page uses |
| `audit-svc` | 3009 | `DATABASE_URL=postgres://postgres:dev@localhost:5435/vektor KEYCLOAK_JWKS_URI=http://localhost:4477/certs PORT=3009 node dist/src/index.js` |
| `coa-svc` | 3010 | see `services/coa-svc/README.md` |
| `reporting-svc` | 3011 | `mkdir -p storage && DATABASE_URL=postgres://postgres:dev@localhost:5435/vektor KEYCLOAK_JWKS_URI=http://localhost:4477/certs PORT=3011 node dist/src/index.js` |
| `alert-svc` | 3013 | `DATABASE_URL=postgres://postgres:dev@localhost:5435/vektor REDIS_URL=redis://localhost:16379 KEYCLOAK_JWKS_URI=http://localhost:4477/certs PORT=3013 node dist/src/index.js` |
| `logistics-svc` | 3014 | `DATABASE_URL=postgres://postgres:dev@localhost:5435/vektor ROUTING_DATABASE_URL=postgres://postgres:dev@localhost:5435/vektor KEYCLOAK_JWKS_URI=http://localhost:4477/certs KAFKA_BROKERS=localhost:19092 PORT=3014 node dist/src/index.js` |

You don't need every service running — a page whose backend isn't up just shows a
clear fetch error instead of data, it won't crash the app. At minimum, start the
service(s) behind whichever screen you're testing.

**⚠️ Only run one `next dev` (or `pnpm build`) against this exact `apps/web`
checkout at a time.** Two `next dev` processes — or a `pnpm build` while one is
running — share the same `.next/` output directory and will corrupt each other's
build cache, breaking every route with `ENOENT` 500s until you `rm -rf .next` and
restart. If you hit that, it's almost always this.

## 4. Start apps/web itself

```bash
cd vektor-web/apps/web
PORT=3020 \
NEXT_PUBLIC_ALERT_SVC_URL=http://localhost:3013 \
NEXT_PUBLIC_LOGISTICS_SVC_URL=http://localhost:3014 \
NEXT_PUBLIC_AUDIT_SVC_URL=http://localhost:3009 \
NEXT_PUBLIC_CV_INFERENCE_SVC_URL=http://localhost:3006 \
NEXT_PUBLIC_REPORTING_SVC_URL=http://localhost:3011 \
pnpm dev
```

(`NEXT_PUBLIC_COA_SVC_URL` and `NEXT_PUBLIC_SOCKET_URL` default to `:3010`/`:3007`
already — override only if those services run elsewhere.)

## 5. Log in and switch roles

1. Open `http://localhost:3020/settings`.
2. Pick a role from the dropdown, click **"Mint via dev bridge."** This is the
   dev-only stand-in for a real Keycloak login — never available outside local dev.
3. The top nav updates immediately to show only what that role can reach. To try a
   different role, just mint again — no logout step needed.

| Role | What you should see in the nav |
|---|---|
| Viewer | Alerts, Settings |
| Field Operator | Alerts, Settings |
| Analyst | Map, Target Workbench, Alerts, Settings |
| Logistics Officer | Alerts, Logistics, Settings |
| Commander | Map, Target Workbench, Alerts, Logistics, Settings |
| SuperAdmin | Map, Target Workbench, Alerts, Logistics, Admin, Settings |

## 6. What to actually click on

- **Map** (Analyst+) — live entity feed, sensor health, camera feeds, no-strike
  zones. Needs `fusion-svc` (socket) and `geospatial-svc` for real data.
- **Target Workbench** (Analyst+) — ranked threats + COA generation; approve/reject
  buttons only appear for Commander/SuperAdmin. Needs `coa-svc`.
- **Alerts** (all roles view; Analyst+ acknowledge/escalate/dismiss) — triage queue.
  Geofence zone list only appears for Analyst+; create/delete only for
  Commander/SuperAdmin. Needs `alert-svc`.
- **Logistics** (Logistics Officer+) — inventory/forecast table + route planner.
  Needs `logistics-svc`.
- **Admin** (SuperAdmin only) — audit log search + CV model hot-swap (requires an
  explicit confirmation checkbox before it'll let you upload — it replaces the live
  inference model immediately). Needs `audit-svc` and `cv-inference-svc`.

## 7. Confirming access control is actually enforced (not just hidden)

The nav hides links you can't use, but every real request is checked server-side
too — try this to see both layers:

```bash
# Mint a low-privilege token
curl "http://localhost:4477/mint?role=Analyst&sub=test"
# copy the "token" value, then:
curl -H "Authorization: Bearer <token>" http://localhost:3013/api/v1/geofence-zones
# 200 — Analyst can view zones

curl -X DELETE -H "Authorization: Bearer <token>" http://localhost:3013/api/v1/geofence-zones/<some-id>
# 403 — Analyst cannot delete a zone, only Commander/SuperAdmin can
```

If you paste an Analyst token into `/settings`'s "paste a token" field and visit
`/admin` directly, you should see a clean "Access restricted" screen, not a crash
and not the real page content.
