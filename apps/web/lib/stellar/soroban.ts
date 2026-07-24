// JELAJAH — Soroban SDK Helpers
import { rpc, TransactionBuilder, Contract, Address, nativeToScVal, scValToNative, Networks } from "@stellar/stellar-sdk";
import type { xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "@/config/contracts";

export interface TxResult { hash: string; success: boolean; result?: string; error?: string; }

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

export function fromScVal(val: xdr.ScVal): unknown { return scValToNative(val); }

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
  try { await simulateTx(pubKey, c, "create_hunt", args); return { hash: "", success: true, result: "Sim OK" }; }
  catch (e) { return { hash: "", success: false, error: e instanceof Error ? e.message : "Failed" }; }
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
  try { await simulateTx(pubKey, c, "submit_claim", args); return { hash: "", success: true, result: "Sim OK" }; }
  catch (e) { return { hash: "", success: false, error: e instanceof Error ? e.message : "Failed" }; }
}
