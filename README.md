# vektor-web

The VEKTOR frontend — see [VEKTOR-PRD.md](../vektor-docs/VEKTOR-PRD.md) §9.2 and §9.6. Split out of `vektor-platform` (now [`vektor-backend`](../vektor-backend)) so the frontend and backend ship as independent repos/deployments.

## Layout

```
apps/
  web/           Operator dashboard — Next.js 15 App Router + MapLibre GL (FE-001/002/003, §10.1)
packages/
  ui/            Shared React components (shadcn/ui base) for apps/web and the future apps/field-pwa
  config/        Shared TypeScript base config (tsconfig.base.json)
```

`apps/field-pwa` doesn't exist yet — no FE-xxx roadmap task has created it — but when it lands it belongs in this repo alongside `apps/web`, not in `vektor-backend`.

## Local development

`apps/web` depends on `@vektor/shared`, which lives in the sibling `vektor-backend` repo (`packages/shared`) and is consumed via a filesystem `link:`, the same cross-repo pattern `vektor-backend` itself uses for `vektor-proto`. Build the dependency chain in order:

```bash
cd ../vektor-proto && pnpm build
cd ../vektor-backend/packages/shared && pnpm install && pnpm build
cd ../../../vektor-web && pnpm install
pnpm build
```

## Commands

```bash
pnpm install
pnpm build   # turbo run build, cached & parallel across the workspace
pnpm dev     # turbo run dev
pnpm lint    # turbo run lint (typecheck)
```
