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
- `/lab` — deterministic Gate replay with unsupported metrics left blank
- `/rafiki` — explain-only receipt Q&A with deterministic fallback
- `/coin/{mint}` — public, on-demand mint and holder dossier
- `/crew` — all six jobs with explicit permissions and hard boundaries
- `/token` — official $APEGATE status and contract-address registry
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

Launch Bay is parked for v1 and hidden by default. The retained internal
scaffold is available only when `NEXT_PUBLIC_LAUNCH_BAY_ENABLED=true`; real
trading, transaction safety, and exit behavior take priority.

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

## Lab and Rafiki

Zira's Lab recomputes the recorded fixture through the shared core and produces
a deterministic replay hash plus verdict counts. It does not publish
precision, recall, win rate, expectancy, or drawdown without production outcome
labels and calibrated canary data.

Rafiki accepts only hash-verified local receipts. Without AI credentials it
uses a deterministic explanation from receipt fields. With `AI_GATEWAY_URL`,
`AI_GATEWAY_TOKEN`, and `RAFIKI_MODEL`, the server can request an explain-only
narrative through Cloudflare AI Gateway's OpenAI-compatible endpoint. Numeric
facts remain deterministic; responses containing digits or trading language
are rejected back to the local fallback. `RAFIKI_PROVIDER_API_KEY` is optional
when the selected Gateway model needs a dynamic provider key.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127). Credentials are optional
for local use: the feed falls back to `fixtures/tapes/pump-launches.json`, a
recorded set of real create events. Set `HELIUS_RPC_URL` for dependable mint
reads. `SOLANA_RPC_URL` is the provider-neutral server-only override and takes
precedence; `HELIUS_API_KEY` can derive the Helius endpoint when neither URL is
set. None of these values enter the browser bundle. `RUGCHECK_API_KEY` is
optional.

## Wallet and Vault status

Wallet login uses Privy with external Solana wallets only. The provider shows
Solana wallets, uses wallet login, and explicitly disables automatic Ethereum
or Solana embedded-wallet creation. It authenticates the wallet session but
does not build or send a transaction. Manual signing remains the default.

Privy Vault is also wired to the Worker-compatible `@privy-io/node` server SDK.
The App ID and App Secret are enough to initialize that client. The separate
authorization private key is required only for future delegated Vault actions.
`/api/vault/status` reports configuration booleans and local client
initialization only; it never returns credential values or calls a
wallet-mutation endpoint.

Copy these exact values into `.env.local`:

- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `PRIVY_AUTHORIZATION_PRIVATE_KEY`

`NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_ID` are the same public App ID from
the Privy dashboard, copied into browser and server scopes. The authorization
private key must be base64-encoded PKCS8 with no PEM headers. The App Secret
and authorization private key are server-only and must never use a
`NEXT_PUBLIC_` name. The public App IDs are declared in `wrangler.jsonc`; the
App Secret must be an encrypted Worker secret.

For Cloudflare, set both App ID variables in the build environment and store
the sensitive values as encrypted Worker secrets:

```bash
npx wrangler secret put PRIVY_APP_SECRET
npx wrangler secret put PRIVY_AUTHORIZATION_PRIVATE_KEY
```

Privy dashboard checklist:

1. Under **App settings → Domains**, temporarily allow
   `http://127.0.0.1:43127` and `http://localhost:43127`.
2. Add `https://apegate.io` after DNS is active, then remove production-app
   localhost access when development no longer needs it.
3. Keep wallet login and external Solana wallets enabled.
4. Keep smart/embedded wallets off. The application also enforces
   `createOnLogin: "off"` for both chains.
5. Generate an authorization private key only when delegated Vault work starts.

Domain setup does not block the current build. Credentials only make the SDK
ready: Vault creation remains hard-disabled pending the policy signer,
transaction firewall, mainnet canaries, revoke tests, and external security
review.

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
