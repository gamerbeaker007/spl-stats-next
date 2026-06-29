import { GeneratedFortuneWinner } from "@/types/fortune/fortune";
import { SplAvailablePrize, SplFortuneEntry, SplFortuneVerificationData } from "@/types/spl/draws";
import md5 from "md5";
import seedrandom from "seedrandom";

/**
 * Exact implementation of the official Splinterlands
 * Fortune Draw verifier.
 */
export function generateFortuneDraw(
  verification: SplFortuneVerificationData,
  entries: SplFortuneEntry[],
  prizes: SplAvailablePrize[],
  prizeCount: number
): GeneratedFortuneWinner[] {
  //
  // Same seed generation as the official frontend.
  //
  const seed = md5(verification.block_id + verification.prev_block_id + verification.trx_id);

  const rng = seedrandom(seed);

  //
  // Clone because the verifier mutates both arrays.
  //
  const availablePrizes = [...prizes];
  const remainingPlayers = entries.map((x) => ({ ...x }));

  let totalEntries = remainingPlayers.reduce((sum, player) => sum + player.entries, 0);

  let prizesRemaining = Math.min(prizeCount, availablePrizes.length);

  const winners: GeneratedFortuneWinner[] = [];

  while (prizesRemaining > 0 && availablePrizes.length > 0 && totalEntries > 0) {
    prizesRemaining--;

    //
    // Random prize
    //
    const prizeIndex = Math.floor(rng() * availablePrizes.length);

    const prize = availablePrizes.splice(prizeIndex, 1)[0];

    //
    // Weighted player selection
    //
    const ticket = Math.floor(rng() * totalEntries);

    let runningTotal = 0;

    for (let i = 0; i < remainingPlayers.length; i++) {
      const player = remainingPlayers[i];

      runningTotal += player.entries;

      if (ticket < runningTotal) {
        winners.push({
          player: player.player,
          entries: player.entries,
          prize,
        });

        totalEntries -= player.entries;

        remainingPlayers.splice(i, 1);

        break;
      }
    }
  }

  return winners;
}
