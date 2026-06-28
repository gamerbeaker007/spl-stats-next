"use server";

import {
  fetchCompletedRankedDraws,
  fetchRankedDrawAvailablePrizes,
  fetchRankedDrawEntries,
} from "@/lib/backend/api/spl/spl-api";
import { createFortuneWinners, getLatestProcessedDrawId } from "@/lib/backend/db/foruneWinner";
import logger from "@/lib/backend/log/logger.server";
import {
  SplAvailablePrize,
  SplFortuneEntry,
  SplFortuneVerificationData as SplRankedVerificationData,
} from "@/types/spl/draws";
import { FortuneType } from "@prisma/client";
import { generateFortuneDraw } from "./fortune-draw";

export function generateRankedDraw(
  verification: SplRankedVerificationData,
  entries: SplFortuneEntry[],
  prizes: SplAvailablePrize[]
) {
  return generateFortuneDraw(
    verification,
    entries,
    prizes,
    78 // Frontier = 76, Ranked = 78
  );
}

export async function updateRankedDrawWinners(): Promise<void> {
  const completedDraws = (await fetchCompletedRankedDraws()).sort(
    (a, b) => b.draw_number - a.draw_number
  );

  const latestProcessedDrawId = await getLatestProcessedDrawId(FortuneType.RANKED);

  if (latestProcessedDrawId === completedDraws[0]?.id) {
    logger.info("Worker: ranked draws already up-to-date");
    return;
  }

  const throttleDelay = latestProcessedDrawId === 0 ? 1000 : null; // Delay 1 second for the first run to avoid rate limit

  for (const draw of completedDraws) {
    if (draw.id <= latestProcessedDrawId) {
      break;
    }

    logger.info(`Worker: processing ranked draw ${draw.id}`);

    const [entries, availablePrizes] = await Promise.all([
      fetchRankedDrawEntries(draw.id),
      fetchRankedDrawAvailablePrizes(draw.end_date),
    ]);

    logger.info(
      `Worker: fetched ${entries.length} entries and ${availablePrizes.length} prizes for ranked draw ${draw.id}`
    );

    const winners = await generateRankedDraw(draw.verification_data, entries, availablePrizes);

    logger.info(`Worker: generated ${winners.length} winners for ranked draw ${draw.id}`);

    await createFortuneWinners(FortuneType.RANKED, draw, winners);

    logger.info(
      `Worker: saved ${winners.length} ${FortuneType.RANKED.toLowerCase()} winners for draw ${draw.id}`
    );

    //first time it will load all the draw this will lead to many calls to SPL so when latestPRocessDrawId is 0 add delays between each loop iteration to avoid rate limit
    if (throttleDelay) await new Promise((resolve) => setTimeout(resolve, throttleDelay)); //delay 1 second to avoid rate limit
  }

  logger.info("Worker: ranked draw synchronization completed");
}
