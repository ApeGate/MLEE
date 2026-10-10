import type { LaunchFacts, RawLaunch } from "./types";

export function launchToFacts(
  launch: RawLaunch,
  observedAt: number,
  createdAt = observedAt,
): LaunchFacts {
  return {
    mint: launch.mint,
    signature: launch.signature,
    name: launch.name,
    symbol: launch.symbol,
    creator: launch.traderPublicKey,
    bondingCurve: launch.bondingCurveKey,
    uri: launch.uri,
    createdAt,
    observedAt,
    marketCapSol: launch.marketCapSol,
    initialBuySol: launch.solAmount,
    isMayhem: Boolean(launch.is_mayhem_mode),
    pool: launch.pool ?? "pump",
    tradeCount: 1,
  };
}
