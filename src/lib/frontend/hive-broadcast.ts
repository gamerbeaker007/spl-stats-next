"use client";

import { KeychainKeyTypes, KeychainSDK } from "keychain-sdk";
import { BENEFICIARY_ACCOUNT, BENEFICIARY_WEIGHT, HIVE_COMMUNITY } from "@/types/hive-blog";

interface HiveKeychainWindow extends Window {
  hive_keychain?: unknown;
}

/**
 * Generates a URL-safe permlink for a Hive post.
 * Format: season-<N>-report-<timestamp36>
 */
export function generatePermlink(seasonId: number, username?: string): string {
  const suffix = username ? `-${username.toLowerCase()}` : "";
  return `season-${seasonId}-report${suffix}-${Date.now().toString(36)}`;
}

/**
 * Broadcasts a Hive blog post via Hive Keychain extension.
 * Posts to the Splinterlands community (hive-13323) with 10% beneficiary to beaker007.
 */
export async function broadcastHivePost(
  username: string,
  title: string,
  body: string,
  permlink: string,
  userTags: string[]
): Promise<void> {
  const win = window as HiveKeychainWindow;
  if (!win?.hive_keychain) {
    throw new Error("Hive Keychain extension not found. Please install it and try again.");
  }

  const keychain = new KeychainSDK(win);

  // Community goes first so Hive routes the post correctly
  const allTags = [HIVE_COMMUNITY, ...userTags];

  const jsonMetadata = JSON.stringify({
    tags: allTags,
    app: "spl-stats/1.0",
    format: "markdown",
  });

  const result = await keychain.broadcast({
    username: username.toLowerCase(),
    operations: [
      [
        "comment",
        {
          parent_author: "",
          parent_permlink: HIVE_COMMUNITY,
          author: username.toLowerCase(),
          permlink,
          title,
          body,
          json_metadata: jsonMetadata,
        },
      ],
      [
        "comment_options",
        {
          author: username.toLowerCase(),
          permlink,
          max_accepted_payout: "1000000.000 HBD",
          percent_hbd: 10000,
          allow_votes: true,
          allow_curation_rewards: true,
          extensions: [
            [
              0,
              {
                beneficiaries: [{ account: BENEFICIARY_ACCOUNT, weight: BENEFICIARY_WEIGHT }],
              },
            ],
          ],
        },
      ],
    ],
    method: KeychainKeyTypes.posting,
  });

  if (!result?.success) {
    throw new Error(`Post failed: ${result?.message ?? "Unknown error from Keychain"}`);
  }
}
