# Apegate domain and DNS

`apegate.io` is owned. It is the production brand, metadata base, and canonical
host. DNS propagation must not pause the guarded mainnet canary or other live
trade work; the Worker hostname remains the operational fallback until the
custom hostnames answer successfully.

## Current hosting: Cloudflare Worker

The application is deployed as the `apegate-web` Worker. The zone delegates to
Cloudflare nameservers, but the Cloudflare account currently authenticated for
Worker deploys cannot see the `apegate.io` zone. Cloudflare returned `10083`
when the custom domains were attached. Add the zone to the same account as the
Worker, or deploy the Worker from the account that owns the zone, before
enabling the route block below.

Rechecked on 2026-10-10: `lina.ns.cloudflare.com` and
`bill.ns.cloudflare.com` are authoritative, but the apex and `www` still have
no A, AAAA, or CNAME answer, so HTTPS cannot resolve yet. The current Wrangler
identity can deploy `apegate-web` but still does not have the zone in its
account. This is an account-placement block, not DNS propagation or Worker
code; the workers.dev release remains usable.

## One-time Cloudflare click path

Cloudflare does not allow a Worker Custom Domain to cross accounts. First place
`apegate-web` in the same Cloudflare account that already shows the active
`apegate.io` zone. The one-time dashboard action is then:

**Workers & Pages → apegate-web → Settings → Domains & Routes → Add → Custom
Domain → enter `apegate.io` → Add Custom Domain.**

Repeat that exact path once for `www.apegate.io`. Cloudflare creates the DNS
records and certificates; do not add manual A, AAAA, or CNAME records for those
hosts. This account-placement action is the only remaining domain blocker and
does not affect the workers.dev release.

## Privy Allowed Domains

Keep these entries in **Privy → App settings → Domains**:

- `https://apegate.io`
- `https://www.apegate.io`
- `http://localhost:43127`

Use `http://localhost:43127` for normal development. Privy treats
`http://127.0.0.1:43127` as a separate origin, so add it explicitly only when
the numeric loopback URL is required. Development entries are local only;
never add wildcard production domains.

## Verification without blocking trading

Keep the Worker deployment available while DNS and TLS converge. Verify the
custom domains independently:

```bash
dig NS apegate.io +short
dig apegate.io A +short
dig apegate.io AAAA +short
dig www.apegate.io CNAME +short
curl -I https://apegate.io
curl -I https://www.apegate.io
```

Continue live trading through the locally signed canary regardless of these
checks. DNS changes affect the web hostname, not Solana transaction signing or
Helius RPC access.

References:

- [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Pages Custom Domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare full DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
