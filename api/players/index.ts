import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readAllDocs } from "../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const docs = await readAllDocs();
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ docs });
}
