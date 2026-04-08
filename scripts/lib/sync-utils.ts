import { Season } from "@prisma/client";
import { fetchPlayerDetails } from "@/lib/backend/api/spl/spl-api";


export async function getPlayerFirstSeasonId(
  username: string,
  allSeasons: Season[]
): Promise<number | undefined> {
  const details = await fetchPlayerDetails(username);
  return allSeasons.find((s) => s.endsAt >= new Date(details.join_date))?.id;
}
