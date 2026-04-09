import { getLatestSeasonAction } from "@/lib/backend/actions/player-actions";
import { useEffect, useState } from "react";

export function useLatestSeasonId(): number | undefined {
  const [seasonId, setSeasonId] = useState<number | undefined>(undefined);

  useEffect(() => {
    getLatestSeasonAction().then((season) => {
      if (season) setSeasonId(season.id);
    });
  }, []);

  return seasonId;
}
