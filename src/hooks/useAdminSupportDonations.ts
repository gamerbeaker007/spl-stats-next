"use client";

import {
  getSupportDonationsAction,
  type SupportDonationRow,
} from "@/lib/backend/actions/support-admin-actions";
import type { SortOrder, SupportDonationSortField } from "@/lib/backend/db/support-donations";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 25;

export function useAdminSupportDonations() {
  const [donations, setDonations] = useState<SupportDonationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SupportDonationSortField>("date");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [refreshCount, setRefreshCount] = useState(0);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const result = await getSupportDonationsAction(page, PAGE_SIZE, sortBy, order);
      if (result.success) {
        setDonations(result.donations);
        setTotal(result.total);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    load();
  }, [page, sortBy, order, refreshCount]);

  const toggleSort = useCallback((field: SupportDonationSortField) => {
    setPage(1);
    setSortBy((currentSortBy) => {
      if (currentSortBy === field) {
        setOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"));
        return currentSortBy;
      }
      setOrder("desc");
      return field;
    });
  }, []);

  const refresh = useCallback(() => setRefreshCount((value) => value + 1), []);

  return {
    donations,
    total,
    pages,
    loading,
    error,
    page,
    setPage,
    sortBy,
    order,
    toggleSort,
    refresh,
  };
}
