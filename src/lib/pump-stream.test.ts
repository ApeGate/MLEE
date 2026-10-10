import { describe, expect, it } from "vitest";
import {
  parsePumpLaunch,
  parsePumpMigration,
  parsePumpTrade,
} from "./pump-stream";

const launch = {
  signature:
    "4qb5m3kUE9kTqKjiEiu9GWcFVEAKQxix8Fsevxa6Hm4ZBBcScohXfWCa3eHQC8oDsYUQN4Eu5bcBK6pvif13HoJL",
  mint: "Ex6KePrCjGvdVnC8XuF1ozB5og39B1C7sVFM1n4A6KUz",
  traderPublicKey: "FfzbKJ1iQZcym5c52VHZcTaJHDA42rKFhJ4g5BKGPVFS",
  txType: "create",
  initialBuy: 34_194_029.850746,
  solAmount: 0.9875,
  bondingCurveKey: "Ah2qyBcg6udLuq5JGqtmUBzzx52H7XNvSD6dk6mqd49V",
  vTokensInBondingCurve: 1_038_805_970.149254,
  vSolInBondingCurve: 30.9875,
  marketCapSol: 29.8299,
  name: "Print.Fun",
  symbol: "PF",
  uri: "https://ipfs.io/ipfs/bafy-token",
  is_mayhem_mode: false,
  pool: "pump",
};

describe("Pump stream boundary", () => {
  it("accepts a bounded create and strips control characters", () => {
    expect(
      parsePumpLaunch({
        ...launch,
        name: " Print\u0000 Fun ",
        symbol: " PF\n",
      }),
    ).toMatchObject({
      name: "Print Fun",
      symbol: "PF",
      mint: launch.mint,
      txType: "create",
    });
  });

  it("rejects malformed identifiers, unsafe metadata, and non-finite facts", () => {
    expect(parsePumpLaunch({ ...launch, mint: "not-a-mint" })).toBeNull();
    expect(parsePumpLaunch({ ...launch, uri: "http://127.0.0.1/meta" })).toBeNull();
    expect(parsePumpLaunch({ ...launch, marketCapSol: Number.NaN })).toBeNull();
    expect(parsePumpLaunch({ ...launch, txType: "sell" })).toBeNull();
  });

  it("accepts only bounded buy and sell updates", () => {
    expect(
      parsePumpTrade({
        mint: launch.mint,
        txType: "buy",
        marketCapSol: 42,
      }),
    ).toEqual({
      mint: launch.mint,
      txType: "buy",
      marketCapSol: 42,
    });
    expect(
      parsePumpTrade({
        mint: launch.mint,
        txType: "sell",
        marketCapSol: Number.POSITIVE_INFINITY,
      }),
    ).toBeNull();
  });

  it("accepts a bounded PumpSwap migration event", () => {
    expect(
      parsePumpMigration({
        txType: "migrate",
        mint: launch.mint,
        signature: launch.signature,
        pool: "pump-amm",
      }),
    ).toMatchObject({
      mint: launch.mint,
      signature: launch.signature,
      name: null,
      symbol: null,
    });
    expect(
      parsePumpMigration({
        txType: "migrate",
        mint: launch.mint,
        signature: launch.signature,
        pool: "pump",
      }),
    ).toBeNull();
  });
});
