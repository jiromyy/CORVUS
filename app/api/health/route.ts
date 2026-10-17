import { connection } from "next/server";
import { envStatus } from "@/lib/env";

export async function GET() {
  await connection();
  return Response.json({
    status: "ok",
    service: "corvus",
    time: new Date().toISOString(),
    revision: process.env.K_REVISION ?? "local",
    config: envStatus(),
  });
}
