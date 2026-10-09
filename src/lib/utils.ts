import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSol(n: number) {
  return `${n.toFixed(n >= 10 ? 2 : 3)} SOL`;
}

export function formatPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}
