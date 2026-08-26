import { requireSession } from "@/lib/auth/session";
import { uploadImageToPinata } from "@/lib/ipfs/pinata.server";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasValidSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    return bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  }
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "File gambar wajib diisi" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "Gunakan JPEG, PNG, atau WebP maksimal 8 MB" },
        { status: 400 }
      );
    }

    const header = new Uint8Array((await file.slice(0, 16).arrayBuffer()));
    if (!hasValidSignature(header, file.type)) {
      return Response.json({ error: "Isi file tidak cocok dengan format gambar" }, { status: 400 });
    }

    return Response.json(await uploadImageToPinata(file));
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return Response.json(
      { error: unauthenticated ? "Wallet belum terautentikasi" : "Upload IPFS gagal" },
      { status: unauthenticated ? 401 : 500 }
    );
  }
}
