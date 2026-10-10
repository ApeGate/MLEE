# Blotter

Blotter runs your Pump.fun trading rules and keeps a clear record: it checks new coins, waits for your entry, then buys and exits inside the limits you set.

This repo includes a **simulated** desk so you can try the workflow locally. No wallet. No live trades.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

- `/` — homepage
- `/desk` — strategy desk (simulated)

## Stack

Next.js, TypeScript, Tailwind CSS.
