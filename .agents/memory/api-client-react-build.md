---
name: api-client-react build & TypeScript project references
description: How to add new hooks/types to the api-client-react lib so rxmanager picks them up correctly via TypeScript project references.
---

## The rule

`lib/api-client-react` uses TypeScript **project references** (composite mode). rxmanager does NOT read source files directly — it reads compiled declaration files from `lib/api-client-react/dist/`.

After any change to `lib/api-client-react/src/**`, you MUST rebuild the lib:

```bash
pnpm --filter @workspace/api-client-react exec tsc -b
```

This emits `.d.ts` files into `dist/generated/` that rxmanager's tsc can resolve.

## Do NOT append to api.ts

The generated `api.ts` file is ~12,800+ lines. TypeScript silently stops resolving exports added past a certain tail length. Exports appended to the bottom of that file will not be found even though the code is syntactically correct.

**Instead:** create a separate file (e.g. `api-network.ts`) in `src/generated/` with its own imports, and add `export * from "./generated/api-network"` to `src/index.ts`.

## Workflow

1. Write new hooks/types in a new file under `src/generated/`
2. Add `export * from "./generated/<new-file>"` to `src/index.ts`
3. Run `pnpm --filter @workspace/api-client-react exec tsc -b`
4. Run `pnpm --filter @workspace/rxmanager exec tsc -p tsconfig.json --noEmit` to verify

**Why:** TypeScript project references require compiled output. Skipping step 3 means the rxmanager TS check will say "module has no exported member" even though the source is correct.
