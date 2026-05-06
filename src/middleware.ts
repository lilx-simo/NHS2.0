import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production-min-32-chars!!"
);

const PUBLIC = ["/", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname === p)) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (pathname.match(/\.(ico|png|jpg|svg|webp)$/)) return NextResponse.next();

  const token = req.cookies.get("nhs-token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const res = NextResponse.next();
    res.headers.set("x-user-id", String(payload.userId));
    res.headers.set("x-user-role", String(payload.role));
    return res;
  } catch {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.set({ name: "nhs-token", value: "", maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|nhs-logo.png).*)"],
};
