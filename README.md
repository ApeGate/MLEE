# Apegate

[apegate.io](https://apegate.io) is the checkpoint for fresh Pump.fun
launches: facts go in, Kong runs deterministic checks, and a tamper-evident
decision receipt comes out.

This release keeps every real-money path disabled while live intelligence and
the local PAPER loop are exercised:

- `/` — Gate-first product home
- `/feed` — real launch discovery with a recorded real-tape fallback
- `/paper` — local 10 SOL practice portfolio with modeled buys and exits
- `/plans` — bounded lifecycle plan drafts and recorded-tape eligibility rehearsal
- `/vault` — hashed Privy policy preview; signer creation remains locked
- `/coin/{mint}` — public, on-demand mint and holder dossier
- `/crew` — all six jobs with explicit permissions and hard boundaries
- `/token` — official $APEGATE status and contract-address registry
- `/launch` — Launch Bay local preparation and Kong preflight scaffold
- `/status` — honest capability status
- `/desk` — redirects to the Gate

The feed connects to the public Pump launch stream in the browser. Opening a
launch asks Solana RPC for mint safety and an optional independent risk source
for holder and creator context. Missing data forces `WAIT`; it never becomes a
silent `PASS`.

## Official $APEGATE token

The go-to-market token route is staged without inventing a contract address.
Until `NEXT_PUBLIC_APEGATE_TOKEN_MINT` contains a confirmed Solana mint,
`/token` says **NOT PUBLISHED** and no buy link is rendered. Kong
`gate-1.1.0` hard-blocks names and tickers that resemble Apegate—including
spacing and leetspeak variants—unless the mint exactly matches that configured
address.

After the official creation is confirmed:

1. set `NEXT_PUBLIC_APEGATE_TOKEN_MINT` to the verified CA;
2. verify the address rendered at `apegate.io/token`;
3. set `OFFICIAL_TOKEN_LAUNCH_ENABLED=true` to unlock the Pump.fun buy route.

The production launch still needs `OFFICIAL_CREATOR_WALLET`, `PINATA_JWT`, and
the creator wallet's manual signature. No key material belongs in git.

Launch Bay is approved and sequenced after the Gate. Its current Phase 1
surface prepares metadata, token settings, clean-launch guardrails, and a local
receipt preview. It cannot upload metadata or build, sign, or send a
`create_v2` transaction; those controls stay locked until the trading and
transaction-safety foundations are complete.

## PAPER mode

The paper desk consumes the same live/replay launch feed and Kong verdicts as
the Gate. Quotes use a deterministic `market-cap-estimate-v1` model with
explicit price impact, user slippage, a 1.25% protocol estimate, and the locked
0.5% Apegate fee. Buys, partial exits, positions, and fills stay in local
browser storage; every fill also writes a hash-chained `PAPER` receipt.

This is intentionally not presented as a real fill model: it does not claim
reserve-curve parity, landing, MEV, or wallet execution. `BLOCK` disables paper
entry; `WARN` and `WAIT` require an explicit acknowledgement and can never
bypass Kong for future real trading.

## Plans and Privy Vault

Plans can be validated, rehearsed against recorded Gate decisions, hashed, and
saved locally as immutable inactive versions. The current fixture tape does not
contain reserve progression or outcome labels, so rehearsal honestly reports
eligibility counts only—never hypothetical P&L.

The Vault page builds a deterministic Privy policy preview with per-trade and
daily caps, program allowlists, open-position limits, profit sweeps, and
withdrawals fixed to the owner wallet. The preview can write a receipt, but
Vault creation, funding, policy signing, and automation are hard-disabled
regardless of credential presence. They remain blocked on the transaction
firewall, mainnet canaries, revoke tests, and an external security review.

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
chains, `gate-1.1.0`, and the locked 0.5% Apegate fee. Cloudflare deployment is
pinned to OpenNext via `open-next.config.ts` and `wrangler.jsonc`, with logs and
traces enabled.
