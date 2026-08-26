import {
  Address,
  FeeBumpTransaction,
  rpc,
  scValToNative,
  TransactionBuilder,
  type xdr,
} from "@stellar/stellar-sdk";
import { getNetworkPassphrase, getRpcServer } from "@/lib/stellar/soroban";

export interface VerifiedContractCall {
  args: xdr.ScVal[];
  returnValue: xdr.ScVal | undefined;
}

export async function verifyContractCall(
  transactionHash: string,
  expectedContract: string,
  expectedMethod: string
): Promise<VerifiedContractCall> {
  if (!/^[0-9a-f]{64}$/i.test(transactionHash)) {
    throw new Error("Hash transaksi tidak valid");
  }

  const response = await getRpcServer().getTransaction(transactionHash);
  if (response.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("Transaksi belum berhasil dikonfirmasi");
  }

  const parsed = TransactionBuilder.fromXDR(
    response.envelopeXdr.toXDR("base64"),
    getNetworkPassphrase()
  );
  const transaction =
    parsed instanceof FeeBumpTransaction ? parsed.innerTransaction : parsed;
  const invocations = transaction.operations.filter(
    (operation) => operation.type === "invokeHostFunction"
  );
  if (invocations.length !== 1) {
    throw new Error("Transaksi harus berisi tepat satu pemanggilan kontrak");
  }

  const operation = invocations[0];
  if (operation.type !== "invokeHostFunction") {
    throw new Error("Operasi kontrak tidak ditemukan");
  }
  if (operation.func.switch().name !== "hostFunctionTypeInvokeContract") {
    throw new Error("Host function bukan pemanggilan kontrak");
  }

  const invocation = operation.func.invokeContract();
  const contract = Address.fromScAddress(invocation.contractAddress()).toString();
  const method = invocation.functionName().toString();
  if (contract !== expectedContract || method !== expectedMethod) {
    throw new Error("Transaksi tidak cocok dengan aksi yang diminta");
  }

  return { args: invocation.args(), returnValue: response.returnValue };
}

export function scBytesToHex(value: xdr.ScVal): string {
  const native = scValToNative(value);
  if (!(native instanceof Uint8Array)) {
    throw new Error("Nilai on-chain bukan bytes");
  }
  return Buffer.from(native).toString("hex");
}

export function scAddress(value: xdr.ScVal): string {
  const native = scValToNative(value);
  if (typeof native !== "string") throw new Error("Alamat on-chain tidak valid");
  return native;
}

export function scBigInt(value: xdr.ScVal): bigint {
  const native = scValToNative(value);
  if (typeof native === "bigint") return native;
  if (typeof native === "number" && Number.isInteger(native)) return BigInt(native);
  throw new Error("Integer on-chain tidak valid");
}

export function scNumber(value: xdr.ScVal): number {
  const native = scValToNative(value);
  if (typeof native !== "number" || !Number.isInteger(native)) {
    throw new Error("Angka on-chain tidak valid");
  }
  return native;
}
