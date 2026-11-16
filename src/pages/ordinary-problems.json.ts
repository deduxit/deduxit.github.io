// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The ordinary suite's problems Practice offers, as one JSON file the island
// fetches when Practice first opens on an ordinary tab.
import { getCollection } from "astro:content";
import { offeredOrdinary } from "../lib/practice";

export async function GET() {
  return new Response(JSON.stringify(offeredOrdinary(await getCollection("ordinaryProblems"))), {
    headers: { "content-type": "application/json" },
  });
}
