interface PinataUploadResult {
  cid: string;
  url: string;
}

export async function uploadImageToPinata(file: File): Promise<PinataUploadResult> {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error("Pinata server credentials are not configured");

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: file.name || "jelajah-upload", keyvalues: { app: "jelajah" } })
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { pinata_api_key: apiKey, pinata_secret_api_key: secretKey },
    body: formData,
  });
  if (!response.ok) throw new Error(`Pinata upload failed with status ${response.status}`);

  const data = (await response.json()) as { IpfsHash?: unknown };
  if (typeof data.IpfsHash !== "string" || data.IpfsHash.length < 20) {
    throw new Error("Pinata returned an invalid CID");
  }
  const gateway = process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud";
  return { cid: data.IpfsHash, url: `${gateway}/ipfs/${data.IpfsHash}` };
}
