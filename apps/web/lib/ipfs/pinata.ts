// JELAJAH — IPFS Upload Service (Pinata)

export interface IpfsUploadResult {
  cid: string;
  url: string;
}

const PINATA_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud";

function getPinataHeaders(): Record<string, string> {
  const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY ?? "";
  const secretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY ?? "";

  if (!apiKey || !secretKey) {
    throw new Error("Pinata API key not configured. Set NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY");
  }

  return {
    pinata_api_key: apiKey,
    pinata_secret_api_key: secretKey,
  };
}

/**
 * Upload file to Pinata IPFS.
 * Returns CID and gateway URL.
 */
export async function uploadToIpfs(file: File | Blob): Promise<IpfsUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const metadata = JSON.stringify({
    name: file instanceof File ? file.name : "jelajah-upload",
    keyvalues: {
      app: "jelajah",
      timestamp: new Date().toISOString(),
    },
  });
  formData.append("pinataMetadata", metadata);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: getPinataHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { IpfsHash: string };
  const cid = data.IpfsHash;

  return {
    cid,
    url: `${PINATA_GATEWAY}/ipfs/${cid}`,
  };
}

/**
 * Upload a base64 data URI to IPFS.
 */
export async function uploadBase64ToIpfs(dataUri: string): Promise<IpfsUploadResult> {
  const res = await fetch(dataUri);
  const blob = await res.blob();
  return uploadToIpfs(blob);
}

/**
 * Check if IPFS upload is configured.
 */
export function isIpfsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_PINATA_API_KEY &&
    process.env.NEXT_PUBLIC_PINATA_SECRET_KEY
  );
}
