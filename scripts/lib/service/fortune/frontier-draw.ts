import {
  fetchCompletedFrontierDraws,
  fetchFrontierDrawAvailablePrizes,
  fetchFrontierDrawEntries,
} from "@/lib/backend/api/spl/spl-api";
import { createFortuneWinners, getLatestProcessedDrawId } from "@/lib/backend/db/fortune-winners";
import logger from "@/lib/backend/log/logger.server";
import { SplAvailablePrize, SplFortuneEntry, SplFortuneVerificationData } from "@/types/spl/draws";
import { FortuneType } from "@prisma/client";
import { generateFortuneDraw } from "./fortune-draw";

function generateFrontierDraw(
  verificationData: SplFortuneVerificationData,
  entries: SplFortuneEntry[],
  prizes: SplAvailablePrize[]
) {
  return generateFortuneDraw(
    verificationData,
    entries,
    prizes,
    76 // Frontier = 76, Ranked = 78
  );
}

export async function updateFrontierDrawWinners(): Promise<void> {
  const completedDraws = (await fetchCompletedFrontierDraws()).sort(
    (a, b) => b.draw_number - a.draw_number
  );

  const latestProcessedDrawId = await getLatestProcessedDrawId(FortuneType.FRONTIER);

  if (latestProcessedDrawId === completedDraws[0]?.id) {
    logger.info("Worker: frontier draws already up-to-date");
    return;
  }

  const throttleDelay = latestProcessedDrawId === 0 ? 1000 : null; // Delay 1 second for the first run to avoid rate limit

  for (const draw of completedDraws) {
    if (draw.id <= latestProcessedDrawId) {
      break;
    }
    logger.info(`Worker: processing frontier draw ${draw.id}`);

    const [entries, availablePrizes] = await Promise.all([
      fetchFrontierDrawEntries(draw.id),
      fetchFrontierDrawAvailablePrizes(draw.end_date),
    ]);
    logger.info(
      `Worker: fetched ${entries.length} entries and ${availablePrizes.length} prizes for frontier draw ${draw.id}`
    );

    const winners = await generateFrontierDraw(draw.verification_data, entries, availablePrizes);
    logger.info(`Worker: generated ${winners.length} winners for frontier draw ${draw.id}`);

    await createFortuneWinners(FortuneType.FRONTIER, draw, winners);
    logger.info(
      `Worker: saved ${winners.length} ${FortuneType.FRONTIER.toLowerCase()} winners for draw ${draw.id}`
    );

    //first time it will load all the draw this will lead to many calls to SPL so when latestPRocessDrawId is 0 add delays between each loop iteration to avoid rate limit
    if (throttleDelay) await new Promise((resolve) => setTimeout(resolve, throttleDelay)); //delay 1 second to avoid rate limit
  }

  logger.info("Worker: frontier draw synchronization completed");
}
