export type HolderEvidence = {
  owner: string;
  pct: number;
  insider?: boolean;
};

type KnownAccount = {
  name?: string;
  type?: string;
};

export function selectHolderEvidence(input: {
  reportHolders: HolderEvidence[];
  rpcHolders: HolderEvidence[];
  knownAccounts: Record<string, KnownAccount>;
  bondingCurve: string | null;
  creator: string | null;
  rpcSource: string | null;
}) {
  const reportHolders = input.reportHolders.filter((holder) => {
    const type = input.knownAccounts[holder.owner]?.type;
    return (
      holder.owner !== input.bondingCurve &&
      type !== "AMM" &&
      type !== "LOCKER" &&
      type !== "PROGRAM"
    );
  });
  const holders =
    reportHolders.length > 0 ? reportHolders : input.rpcHolders;
  const source =
    holders.length === 0
      ? null
      : reportHolders.length > 0
        ? "external risk scan"
        : input.rpcSource;

  return {
    holders,
    source,
    devPct: input.creator
      ? holders.find((holder) => holder.owner === input.creator)?.pct ?? null
      : null,
    insiderPct:
      reportHolders.length > 0
        ? reportHolders
            .filter((holder) => holder.insider)
            .reduce((sum, holder) => sum + holder.pct, 0)
        : null,
    top10Pct:
      holders.length > 0
        ? holders
            .slice(0, 10)
            .reduce((sum, holder) => sum + holder.pct, 0)
        : null,
  };
}
