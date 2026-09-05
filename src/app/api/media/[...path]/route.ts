import { NextRequest, NextResponse } from "next/server";
import { getFromStorage } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  if (!path || !path.length) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const key = path.join("/");
  const file = await getFromStorage(key);

  if (!file) {
    return new NextResponse("File Not Found", { status: 404 });
  }

  return new NextResponse(file.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
