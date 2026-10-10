# Apegate

Apegate turns Pump.fun trading rules into a four-agent ape crew:

- **Kong · Scout** — checks age, liquidity, and holder concentration
- **Cheeta · Watch** — waits for your momentum entry
- **Caesar · Trade** — sizes the buy and asks for your approval
- **Cornelius · Risk** — guards budget, position limits, and exits

The working desk is an honest **simulation** with generated market data. No wallet, live trades, or real funds.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

- `/` — Apegate homepage and ape crew
- `/desk` — working strategy simulation and decision tape

## Stack

Next.js, TypeScript, Tailwind CSS.
