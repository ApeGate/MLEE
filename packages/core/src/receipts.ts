import { hashCanonical } from "./canonical";
import type { Receipt } from "./types";

type ReceiptDraft = Omit<Receipt, "id" | "v" | "hash"> & {
  id?: string;
};

function timestampId(ts: number, digest: string): string {
  return `${ts.toString(36).padStart(9, "0")}_${digest.slice(0, 16)}`;
}

export async function createReceipt(draft: ReceiptDraft): Promise<Receipt> {
  const provisional = {
    id: draft.id ?? "",
    v: 1 as const,
    kind: draft.kind,
    actor: draft.actor,
    subject: draft.subject,
    at: draft.at,
    inputs: draft.inputs,
    outputs: draft.outputs,
    evidence: draft.evidence,
    source: draft.source,
    prev: draft.prev,
  };
  const seed = await hashCanonical(provisional);
  const id = draft.id ?? timestampId(draft.at.ts, seed);
  const withoutHash = { ...provisional, id };
  const hash = await hashCanonical(withoutHash);
  return { ...withoutHash, hash };
}

export async function verifyReceipt(receipt: Receipt): Promise<boolean> {
  const { hash, ...withoutHash } = receipt;
  return (await hashCanonical(withoutHash)) === hash;
}

export async function verifyReceiptChain(receipts: Receipt[]): Promise<boolean> {
  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index]!;
    if (!(await verifyReceipt(receipt))) return false;
    const expectedPrevious = index === 0 ? null : receipts[index - 1]!.hash;
    if (receipt.prev !== expectedPrevious) return false;
  }
  return true;
}
