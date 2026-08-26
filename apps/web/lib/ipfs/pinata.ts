export interface IpfsUploadResult {
  cid: string;
  url: string;
}

export async function uploadToIpfs(file: File | Blob): Promise<IpfsUploadResult> {
  const formData = new FormData();
  formData.append("file", file, file instanceof File ? file.name : "jelajah-upload");
  const response = await fetch("/api/ipfs/upload", { method: "POST", body: formData });
  const data = (await response.json()) as Partial<IpfsUploadResult> & { error?: string };
  if (!response.ok || !data.cid || !data.url) {
    throw new Error(data.error ?? "Upload IPFS gagal");
  }
  return { cid: data.cid, url: data.url };
}

export async function uploadBase64ToIpfs(dataUri: string): Promise<IpfsUploadResult> {
  const response = await fetch(dataUri);
  return uploadToIpfs(await response.blob());
}

export function isIpfsConfigured(): boolean {
  return true;
}
