# Apegate

[apegate.io](https://apegate.io) is the checkpoint for fresh Pump.fun
launches: facts go in, Kong runs deterministic checks, and a tamper-evident
decision receipt comes out.

This Phase 0–1 release is deliberately read-only:

- `/` — Gate-first product home
- `/feed` — real launch discovery with a recorded real-tape fallback
- `/launch` — Launch Bay local preparation and Kong preflight scaffold
- `/status` — honest capability status
- `/desk` — redirects to the Gate

The feed connects to the public Pump launch stream in the browser. Opening a
launch asks Solana RPC for mint safety and an optional independent risk source
for holder and creator context. Missing data forces `WAIT`; it never becomes a
silent `PASS`.

Launch Bay is approved and sequenced after the Gate. Its current Phase 1
surface prepares metadata, token settings, clean-launch guardrails, and a local
receipt preview. It cannot upload metadata or build, sign, or send a
`create_v2` transaction; those controls stay locked until the trading and
transaction-safety foundations are complete.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127). Credentials are optional
for local use: the feed falls back to `fixtures/tapes/pump-launches.json`, a
recorded set of real create events. Set `HELIUS_RPC_URL` for dependable mint
reads. `RUGCHECK_API_KEY` is optional.

## Wallet and Vault status

Wallet connect is a connect-only path for the future manual-sign flow. No
transaction can be built, signed, or sent. Manual signing is the default.

Privy Vault is scaffolded in the UI but non-operational. Production Vault work
still needs:

- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `PRIVY_AUTHORIZATION_PRIVATE_KEY`
- policy signer implementation, transaction firewall, and canary tests

Never put server secrets in `NEXT_PUBLIC_` variables.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run cf-typegen
```

The pure TypeScript core in `packages/core` owns canonical JSON, SHA-256 receipt
chains, `gate-1.0.0`, and the locked 0.5% Apegate fee. Cloudflare deployment is
pinned to OpenNext via `open-next.config.ts` and `wrangler.jsonc`, with logs and
traces enabled.
