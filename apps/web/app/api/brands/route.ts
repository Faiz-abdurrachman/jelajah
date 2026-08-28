import { requireSession } from "@/lib/auth/session";
import { getBrandProfileDto, registerBrandProfile } from "@/lib/data/level4";

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Brand request failed";
  if (message === "UNAUTHENTICATED") {
    return Response.json({ error: "Wallet belum terautentikasi" }, { status: 401 });
  }
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const session = await requireSession();
    const brand = await getBrandProfileDto(session.address);
    return Response.json({ brand });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as { companyName?: unknown };
    if (
      typeof body.companyName !== "string" ||
      body.companyName !== body.companyName.trim() ||
      body.companyName.length < 2 ||
      body.companyName.length > 100
    ) {
      return Response.json({ error: "Nama brand harus 2–100 karakter" }, { status: 400 });
    }
    const brand = await registerBrandProfile(session.address, body.companyName);
    return Response.json({ brand }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

