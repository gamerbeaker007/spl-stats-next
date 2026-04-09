"use client";

import {
  generateHiveBlogAction,
  getMonitoredAccountsForBlogAction,
} from "@/lib/backend/actions/hive-blog-actions";
import { broadcastHivePost, generatePermlink } from "@/lib/frontend/hive-broadcast";
import type { HiveBlogResult } from "@/types/hive-blog";
import { useCallback, useEffect, useState } from "react";

interface UseHiveBlogReturn {
  accounts: string[];
  accountsLoading: boolean;
  result: HiveBlogResult | null;
  generating: boolean;
  generateError: string | null;
  posting: boolean;
  postError: string | null;
  postSuccess: boolean;
  postingIndex: number | null;
  postedIndices: number[];
  generate: (selectedAccounts: string[], mode: "combined" | "separate") => Promise<void>;
  post: (
    username: string,
    extraTags: string[],
    postIndex?: number,
    overrideBody?: string
  ) => Promise<void>;
  reset: () => void;
}

export function useHiveBlog(): UseHiveBlogReturn {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [result, setResult] = useState<HiveBlogResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postingIndex, setPostingIndex] = useState<number | null>(null);
  const [postedIndices, setPostedIndices] = useState<number[]>([]);

  useEffect(() => {
    getMonitoredAccountsForBlogAction()
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false));
  }, []);

  const generate = useCallback(
    async (selectedAccounts: string[], mode: "combined" | "separate") => {
      setGenerating(true);
      setGenerateError(null);
      setResult(null);
      setPostSuccess(false);
      setPostError(null);
      setPostedIndices([]);

      try {
        const data = await generateHiveBlogAction(selectedAccounts, mode);
        setResult(data);
      } catch (e) {
        setGenerateError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const post = useCallback(
    async (username: string, extraTags: string[], postIndex?: number, overrideBody?: string) => {
      if (!result) return;
      setPosting(true);
      setPostError(null);
      if (postIndex === undefined) setPostSuccess(false);

      try {
        let title: string;
        let body: string;
        let permlink: string;

        if (postIndex !== undefined && result.mode === "separate") {
          const p = result.posts[postIndex];
          title = p.title;
          body = overrideBody ?? p.body;
          permlink = generatePermlink(result.previousSeasonId, p.username);
        } else {
          title = result.title;
          body = overrideBody ?? result.body;
          permlink = generatePermlink(result.previousSeasonId);
        }

        await broadcastHivePost(username, title, body, permlink, extraTags);

        if (postIndex !== undefined) {
          setPostingIndex(null);
          setPostedIndices((prev) => [...prev, postIndex]);
        } else {
          setPostSuccess(true);
        }
      } catch (e) {
        setPostError(e instanceof Error ? e.message : "Post failed");
      } finally {
        setPosting(false);
        setPostingIndex(null);
      }
    },
    [result]
  );

  const reset = useCallback(() => {
    setResult(null);
    setGenerateError(null);
    setPostError(null);
    setPostSuccess(false);
    setPostedIndices([]);
  }, []);

  return {
    accounts,
    accountsLoading,
    result,
    generating,
    generateError,
    posting,
    postError,
    postSuccess,
    postingIndex,
    postedIndices,
    generate,
    post,
    reset,
  };
}
