// JELAJAH — Soroban SDK Helpers
import { rpc, TransactionBuilder, Contract, Address, nativeToScVal, scValToNative, Networks, xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "@/config/contracts";
import type { QuestStep } from "@/types";

export interface TxResult {
  hash: string;
  success: boolean;
  result?: string;
  error?: string;
  /** Assembled transaction XDR — ready for Freighter signing */
  xdr?: string;
}

let rpcServer: rpc.Server | null = null;

export function getRpcServer(): rpc.Server {
  if (!rpcServer) {
    rpcServer = new rpc.Server(
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
      { timeout: 30000, allowHttp: false }
    );
  }
  return rpcServer;
}

export function getNetworkPassphrase(): string {
  return process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;
}

export function getContract(addr: string): Contract | null {
  if (!addr || addr.length !== 56) return null;
  return new Contract(addr);
}

export function getHuntFactory(): Contract | null { return getContract(CONTRACTS.huntFactory); }
export function getHuntInstance(addr: string): Contract | null { return getContract(addr); }
export function getDisputeContract(): Contract | null { return getContract(CONTRACTS.dispute); }
export function getQuestChainContract(): Contract | null { return getContract(CONTRACTS.questChain); }

/**
 * Build, simulate, and assemble a Soroban contract call transaction.
 * Returns the assembled XDR ready for wallet signing.
 */
export async function prepareContractTx(
  sourcePubKey: string,
  contract: Contract,
  method: string,
  args: xdr.ScVal[]
): Promise<TxResult> {
  const server = getRpcServer();
  const networkPassphrase = getNetworkPassphrase();
  try {
    const acct = await server.getAccount(sourcePubKey);
    const tx = new TransactionBuilder(acct, {
      fee: "1000",
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      return { hash: "", success: false, error: "Simulation failed: " + JSON.stringify(sim) };
    }
    if (!rpc.Api.isSimulationSuccess(sim)) {
      return { hash: "", success: false, error: "Unknown simulation response" };
    }

    // Assemble the transaction with simulation results (footers, fees, etc.)
    const assembled = rpc.assembleTransaction(tx, sim);
    const builtTx = assembled.build();
    const xdrStr = builtTx.toEnvelope().toXDR("base64") as string;

    return { hash: "", success: true, xdr: xdrStr, result: "Prepared — ready to sign" };
  } catch (e) {
    return { hash: "", success: false, error: e instanceof Error ? e.message : "Failed to prepare tx" };
  }
}

/**
 * Submit a signed transaction XDR to the network.
 * Returns the transaction hash.
 */
export async function submitSignedTx(signedXdr: string): Promise<TxResult> {
  const server = getRpcServer();
  try {
    const tx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
    const result = await server.sendTransaction(tx);
    if (result.status === "ERROR") {
      return { hash: "", success: false, error: result.errorResult?.result()?.toString() ?? "Submit failed" };
    }
    return { hash: result.hash, success: true, result: "Submitted" };
  } catch (e) {
    return { hash: "", success: false, error: e instanceof Error ? e.message : "Failed to submit tx" };
  }
}

export async function simulateTx(
  sourcePubKey: string, contract: Contract, method: string, args: xdr.ScVal[]
): Promise<rpc.Api.SimulateTransactionSuccessResponse> {
  const server = getRpcServer();
  const acct = await server.getAccount(sourcePubKey);
  const tx = new TransactionBuilder(acct, { fee: "1000", networkPassphrase: getNetworkPassphrase() })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error("Simulation failed: " + JSON.stringify(sim));
  if (!rpc.Api.isSimulationSuccess(sim)) throw new Error("Unknown simulation response");
  return sim;
}

export async function pollTx(txHash: string, maxAttempts = 30): Promise<TxResult> {
  const server = getRpcServer();
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await server.getTransaction(txHash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) return { hash: txHash, success: true };
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) return { hash: txHash, success: false, error: "Tx failed" };
  }
  return { hash: txHash, success: false, error: "Timeout" };
}

export function toScAddress(addr: string): xdr.ScVal { return Address.fromString(addr).toScVal(); }
export function toScI128(n: bigint | number): xdr.ScVal { return nativeToScVal(n, { type: "i128" }); }
export function toScI64(n: bigint | number): xdr.ScVal { return nativeToScVal(n, { type: "i64" }); }
export function toScU32(n: number): xdr.ScVal { return nativeToScVal(n, { type: "u32" }); }
export function toScU64(n: bigint | number): xdr.ScVal { return nativeToScVal(n, { type: "u64" }); }

export function toScBytesN32(hex: string): xdr.ScVal {
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) throw new Error("Expected 32 bytes");
  return nativeToScVal(buf);
}

export function toScBool(val: boolean): xdr.ScVal {
  return nativeToScVal(val);
}

export function fromScVal(val: xdr.ScVal): unknown { return scValToNative(val); }

export async function computeVoteHash(pubKey: string, vote: boolean, saltHex: string): Promise<string> {
  const verifierScVal = Address.fromString(pubKey).toScVal();
  const voteScVal = nativeToScVal(vote);
  const saltBuf = Buffer.from(saltHex, "hex");
  if (saltBuf.length !== 32) throw new Error("Salt must be 32 bytes");
  const saltScVal = nativeToScVal(saltBuf);

  const vecScVal = xdr.ScVal.scvVec([verifierScVal, voteScVal, saltScVal]);
  const xdrBytes = vecScVal.toXDR();
  const xdrArrayBuf = xdrBytes.buffer.slice(xdrBytes.byteOffset, xdrBytes.byteOffset + xdrBytes.byteLength) as ArrayBuffer;

  const hashBuf = await crypto.subtle.digest("SHA-256", xdrArrayBuf);
  return Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createHuntTx(
  pubKey: string, amountStroops: bigint, gpsLat: number, gpsLng: number,
  radius: number, deadlineUnix: number, clueHashHex: string, huntType: number
): Promise<TxResult> {
  const c = getHuntFactory();
  if (!c) return { hash: "", success: false, error: "Hunt Factory not deployed" };
  const args: xdr.ScVal[] = [
    toScAddress(pubKey), toScI128(amountStroops),
    toScI64(BigInt(Math.round(gpsLat * 10_000_000))),
    toScI64(BigInt(Math.round(gpsLng * 10_000_000))),
    toScU32(radius), toScU64(BigInt(deadlineUnix)),
    toScBytesN32(clueHashHex), toScU32(huntType),
  ];
  return prepareContractTx(pubKey, c, "create_hunt", args);
}

export async function submitClaimTx(
  pubKey: string, instanceAddr: string, photoCidHex: string, lat: number, lng: number
): Promise<TxResult> {
  const c = getHuntInstance(instanceAddr);
  if (!c) return { hash: "", success: false, error: "Instance not found" };
  const args: xdr.ScVal[] = [
    toScAddress(pubKey), toScBytesN32(photoCidHex),
    toScI64(BigInt(Math.round(lat * 10_000_000))),
    toScI64(BigInt(Math.round(lng * 10_000_000))),
  ];
  return prepareContractTx(pubKey, c, "submit_claim", args);
}

// ─── L3 Quest Chain ───────────────────────────────────

/**
 * Convert a QuestStep to its ScVal struct encoding.
 * Soroban structs are encoded as ScvVec with fields in declaration order:
 *   step_number: u32, clue_hash: BytesN<32>, gps_lat: i64, gps_lng: i64, radius: u32, is_final: bool
 */
function questStepToScVal(step: QuestStep): xdr.ScVal {
  return xdr.ScVal.scvVec([
    toScU32(step.stepNumber),
    toScBytesN32(step.clueHash),
    toScI64(BigInt(Math.round(step.gpsLat * 10_000_000))),
    toScI64(BigInt(Math.round(step.gpsLng * 10_000_000))),
    toScU32(Math.round(step.radius)),
    toScBool(step.isFinal),
  ]);
}

/**
 * Decode a ScVal QuestStep struct back to our QuestStep type.
 */
function decodeQuestStep(scVal: xdr.ScVal): QuestStep {
  const vec = scVal.vec();
  if (!vec || vec.length < 6) throw new Error("Invalid QuestStep ScVal");

  return {
    stepNumber: Number(scValToNative(vec[0])),
    clueHash: Array.from((scValToNative(vec[1]) as Uint8Array))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    gpsLat: Number(scValToNative(vec[2])) / 10_000_000,
    gpsLng: Number(scValToNative(vec[3])) / 10_000_000,
    radius: Number(scValToNative(vec[4])),
    isFinal: scValToNative(vec[5]) as boolean,
  };
}

/**
 * Init quest steps on-chain via set_quest_steps(quest_id, hider, Vec<QuestStep>).
 */
export async function setQuestStepsTx(
  pubKey: string,
  questIdHex: string,
  steps: QuestStep[]
): Promise<TxResult> {
  const c = getQuestChainContract();
  if (!c) return { hash: "", success: false, error: "Quest Chain not deployed" };
  const args: xdr.ScVal[] = [
    toScBytesN32(questIdHex),
    toScAddress(pubKey),
    xdr.ScVal.scvVec(steps.map((s) => questStepToScVal(s))),
  ];
  return prepareContractTx(pubKey, c, "set_quest_steps", args);
}

export async function completeStepTx(
  pubKey: string, questIdHex: string, step: number, photoCidHex: string
): Promise<TxResult> {
  const c = getQuestChainContract();
  if (!c) return { hash: "", success: false, error: "Quest Chain not deployed" };
  const args: xdr.ScVal[] = [
    toScBytesN32(questIdHex), toScAddress(pubKey),
    toScU32(step), toScBytesN32(photoCidHex),
  ];
  return prepareContractTx(pubKey, c, "complete_step", args);
}

export async function claimQuestTx(
  pubKey: string, questIdHex: string
): Promise<TxResult> {
  const c = getQuestChainContract();
  if (!c) return { hash: "", success: false, error: "Quest Chain not deployed" };
  const args: xdr.ScVal[] = [toScBytesN32(questIdHex), toScAddress(pubKey)];
  return prepareContractTx(pubKey, c, "claim_quest", args);
}

/**
 * Get quest steps from contract (read-only).
 * Decodes the Vec<QuestStep> ScVal response into QuestStep[].
 */
export async function getQuestStepsTx(pubKey: string, questIdHex: string): Promise<TxResult> {
  const c = getQuestChainContract();
  if (!c) return { hash: "", success: false, error: "Quest Chain not deployed" };
  const args: xdr.ScVal[] = [toScBytesN32(questIdHex)];
  try {
    const sim = await simulateTx(pubKey, c, "get_steps", args);
    const retval = sim.result?.retval;
    if (!retval) return { hash: "", success: false, error: "No return value from contract" };

    const outerVec = retval.vec();
    if (!outerVec) return { hash: "", success: false, error: "Expected Vec<QuestStep>" };

    const steps: QuestStep[] = outerVec.map((s) => decodeQuestStep(s));
    return { hash: "", success: true, result: JSON.stringify(steps) };
  } catch (e) {
    return { hash: "", success: false, error: e instanceof Error ? e.message : "Failed to fetch steps" };
  }
}

/**
 * Get current step for a hunter (read-only).
 * Returns u32 decoded from ScVal.
 */
export async function getCurrentStepTx(pubKey: string, questIdHex: string): Promise<TxResult> {
  const c = getQuestChainContract();
  if (!c) return { hash: "", success: false, error: "Quest Chain not deployed" };
  const args: xdr.ScVal[] = [toScBytesN32(questIdHex), toScAddress(pubKey)];
  try {
    const sim = await simulateTx(pubKey, c, "get_current_step", args);
    const retval = sim.result?.retval;
    if (!retval) return { hash: "", success: false, error: "No return value" };

    const currentStep = Number(scValToNative(retval));
    return { hash: "", success: true, result: String(currentStep) };
  } catch (e) {
    return { hash: "", success: false, error: e instanceof Error ? e.message : "Failed to fetch current step" };
  }
}

// ─── L3 Dispute ───────────────────────────────────────

export async function commitVoteTx(
  pubKey: string, disputeIdHex: string, voteHashHex: string
): Promise<TxResult> {
  const c = getDisputeContract();
  if (!c) return { hash: "", success: false, error: "Dispute not deployed" };
  const args: xdr.ScVal[] = [
    toScBytesN32(disputeIdHex), toScAddress(pubKey), toScBytesN32(voteHashHex),
  ];
  return prepareContractTx(pubKey, c, "commit_vote", args);
}

export async function revealVoteTx(
  pubKey: string, disputeIdHex: string, vote: boolean, saltHex: string
): Promise<TxResult> {
  const c = getDisputeContract();
  if (!c) return { hash: "", success: false, error: "Dispute not deployed" };
  const args: xdr.ScVal[] = [
    toScBytesN32(disputeIdHex), toScAddress(pubKey),
    toScBool(vote), toScBytesN32(saltHex),
  ];
  return prepareContractTx(pubKey, c, "reveal_vote", args);
}

export async function resolveDisputeTx(
  pubKey: string, disputeIdHex: string
): Promise<TxResult> {
  const c = getDisputeContract();
  if (!c) return { hash: "", success: false, error: "Dispute not deployed" };
  const args: xdr.ScVal[] = [toScBytesN32(disputeIdHex)];
  return prepareContractTx(pubKey, c, "resolve", args);
}

export async function appealTx(
  pubKey: string, disputeIdHex: string
): Promise<TxResult> {
  const c = getDisputeContract();
  if (!c) return { hash: "", success: false, error: "Dispute not deployed" };
  const args: xdr.ScVal[] = [toScBytesN32(disputeIdHex), toScAddress(pubKey)];
  return prepareContractTx(pubKey, c, "appeal", args);
}

export async function stakeTx(pubKey: string, amount: number): Promise<TxResult> {
  const c = getDisputeContract();
  if (!c) return { hash: "", success: false, error: "Dispute not deployed" };
  const args: xdr.ScVal[] = [toScAddress(pubKey), toScI128(amount)];
  return prepareContractTx(pubKey, c, "stake", args);
}
