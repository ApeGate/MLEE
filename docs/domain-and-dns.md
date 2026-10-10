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

## Mick: exact unblock steps

The nameserver change is already doing its job. Error `10083` is an account
ownership mismatch: a Worker Custom Domain can only use an active zone owned by
the same Cloudflare account as that Worker. Repeating the deploy from the
current Worker account cannot fix it.

Use Mick's Cloudflare account as the source of truth:

1. Sign in to Mick's Cloudflare dashboard and select the account where
   **Domains → apegate.io** is visible. Confirm the zone status is **Active**.
   If it is not listed, select **Onboard a domain**, add `apegate.io`, and use
   the plan already intended for the site. Do not create a second pending zone
   in another account.
2. In that same account, open **Workers & Pages**. Deploy this repository as
   `apegate-web` there, or grant the deployment identity access to this account
   and deploy it into this account. Copy these non-secret variables:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PRIVY_APP_ID`, and `PRIVY_APP_ID`.
   Re-enter the server secrets in **Settings → Variables and Secrets**:
   `PRIVY_APP_SECRET`, `HELIUS_API_KEY`, `HELIUS_RPC_URL`, and
   `SOLANA_RPC_URL`. Never copy secret values into DNS or git.
3. Open **apegate.io → DNS → Records**. Remove any A, AAAA, or CNAME record
   already using the exact host `apegate.io` or `www` if that hostname will be
   attached as a Worker Custom Domain. Leave MX, TXT, and unrelated subdomains
   alone.
4. Open **Workers & Pages → apegate-web → Settings → Domains & Routes**.
   Select **Add → Custom Domain**, enter `apegate.io`, and confirm. Repeat for
   `www.apegate.io`. Cloudflare creates the DNS records and certificates; do
   not add manual A/AAAA/CNAME records afterward.
5. In Privy, open the Apegate app and add exactly
   `https://apegate.io` and `https://www.apegate.io` under allowed domains.
   Keep Solana login on and smart wallets off.
6. Wait until both Custom Domains show **Active**, then run the verification
   commands below. The apex should serve Apegate and `www` should either serve
   the same Worker or redirect to the apex.

If Mick prefers not to redeploy the Worker, the only equivalent fix is moving
or onboarding the `apegate.io` zone into the current Worker account. Cloudflare
does not let a Custom Domain cross account boundaries.

Prerequisites:

1. Add `apegate.io` as an active Cloudflare DNS zone.
2. If the registrar is not already using Cloudflare DNS, replace its
   authoritative nameservers with the pair Cloudflare assigns.
3. Remove conflicting A, AAAA, or CNAME records for a hostname before attaching
   it as a Worker Custom Domain.

Once the zone and Worker share an account, add the two exact hostnames under
**Workers & Pages → apegate-web → Settings → Domains & Routes**:

- `apegate.io`
- `www.apegate.io`

The ready-to-enable Wrangler configuration is:

```jsonc
{
  "routes": [
    {
      "pattern": "apegate.io",
      "zone_name": "apegate.io",
      "custom_domain": true
    },
    {
      "pattern": "www.apegate.io",
      "zone_name": "apegate.io",
      "custom_domain": true
    }
  ]
}
```

Do not commit that block until the zone is visible to the deploy account:
leaving an unavailable Custom Domain in `wrangler.jsonc` makes otherwise
healthy Worker deploys report a partial trigger failure. Once enabled,
Cloudflare creates the required records and certificates. Do not add a manual
A, AAAA, or CNAME for these Worker Custom Domains.

The canonical host is the apex. Once both hostnames are healthy, a Cloudflare
Single Redirect may send `https://www.apegate.io/*` to
`https://apegate.io/*`. If `www` is used only as the redirect source instead of
as a Worker Custom Domain, give it one proxied originless record:

- `AAAA www → 100::` (preferred), or
- `A www → 192.0.2.0`

Only one placeholder record is needed. It must be proxied. These reserved
addresses are never contacted because Cloudflare applies the redirect at the
edge.

## Cloudflare Pages alternative

This repository currently targets Workers, not Pages. If it is intentionally
moved to Pages:

1. Add each hostname to the Pages project before changing DNS.
2. An apex custom domain requires the `apegate.io` zone to use Cloudflare
   nameservers; Pages then provisions the apex record and certificate.
3. For `www`, use a proxied `CNAME` from `www` to the project's
   `<project>.pages.dev` hostname after adding `www.apegate.io` in Pages.
4. Do not invent fixed A or AAAA addresses for a Pages deployment.

## Privy Allowed Domains

Keep these entries in **Privy → App settings → Domains**:

- `https://apegate.io`
- `https://www.apegate.io`
- `http://127.0.0.1:43127`
- `http://localhost:43127`

The localhost entries are for development only. Never add wildcard production
domains.

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
