# Apegate domain and DNS

`apegate.io` is owned. It is the production brand, metadata base, and canonical
host. DNS propagation must not pause the guarded mainnet canary or other live
trade work; the Worker hostname remains the operational fallback until the
custom hostnames answer successfully.

## Current hosting: Cloudflare Worker

The application is deployed as the `apegate-web` Worker. The zone delegates to
Cloudflare nameservers, and this repository declares both production hostnames
as Worker Custom Domains. Cloudflare creates their DNS records and edge
certificates automatically.

Prerequisites:

1. Add `apegate.io` as an active Cloudflare DNS zone.
2. If the registrar is not already using Cloudflare DNS, replace its
   authoritative nameservers with the pair Cloudflare assigns.
3. Remove conflicting A, AAAA, or CNAME records for a hostname before attaching
   it as a Worker Custom Domain.

The two exact hostnames are visible under **Workers & Pages → apegate-web →
Settings → Domains & Routes** after deployment:

- `apegate.io`
- `www.apegate.io`

The committed Wrangler configuration is:

```jsonc
{
  "routes": [
    { "pattern": "apegate.io", "custom_domain": true },
    { "pattern": "www.apegate.io", "custom_domain": true }
  ]
}
```

Deploying that configuration creates the required records and certificates.
Do not add a manual A, AAAA, or CNAME for these Worker Custom Domains.

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
