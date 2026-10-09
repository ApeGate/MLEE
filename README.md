# Relay

**Relay** is a strategy desk for Solana trenches: Scout filters coins, Watch waits for entries, Desk executes inside your rules, and Relay keeps the handoffs moving.

This repo ships a polished landing page plus a working simulated desk loop (no wallet required).

## Run locally

```bash
npm install
npm run dev -- --port 43127
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

- `/` — landing
- `/desk` — configure a Strategy and run the live specialist desk

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui.

## Note

The desk uses a local simulated market for the core loop demo. Not financial advice. Independent product — not affiliated with Hotbot or related brands.
