"use server";

import { splLogin } from "@/lib/backend/api/spl/spl-api";
import { decryptToken, encryptToken } from "@/lib/backend/auth/encryption";
import logger from "@/lib/backend/log/logger.server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

const USER_COOKIE = "spl_user_id";

/**
 * Get current authentication status
 */
export async function getAuthStatus() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { authenticated: false, username: null };
    }

    return {
      authenticated: true,
      username: user.username,
    };
  } catch (error) {
    logger.error(`getAuthStatus error: ${error}`);
    return { authenticated: false, username: null };
  }
}

/**
 * Login action for keychain authentication
 * Encrypts and stores the long-lived SPL token using AES-256-GCM
 */
export async function loginAction(username: string, timestamp: number, signature: string) {
  try {
    logger.info(`loginAction: ${username}`);

    // Call Splinterlands API to validate credentials and get token
    const splResponse = await splLogin(username, timestamp, signature);

    if (!splResponse.token) {
      return { success: false, error: "No token received from Splinterlands" };
    }

    // Encrypt the token with AES-256-GCM (random IV per encryption)
    const { encryptedValue, iv, authTag } = await encryptToken(splResponse.token);

    // Upsert user in database with encrypted token
    const user = await prisma.user.upsert({
      where: { username },
      create: {
        username,
        encryptedToken: encryptedValue,
        iv,
        authTag,
      },
      update: {
        encryptedToken: encryptedValue,
        iv,
        authTag,
      },
    });

    // Set cookie with user ID
    const cookieStore = await cookies();
    cookieStore.set(USER_COOKIE, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    logger.info(`User ${username} logged in successfully`);

    return {
      success: true,
      username: user.username,
    };
  } catch (error) {
    logger.error(`loginAction error: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Logout action
 */
export async function logoutAction() {
  return logout();
}

/**
 * Add a monitored account to the current user
 * Encrypts and stores the long-lived SPL token using AES-256-GCM
 */
export async function addMonitoredAccount(username: string, timestamp: number, signature: string) {
  try {
    // Get current user from cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;

    if (!userId) {
      return { success: false, error: "Not logged in" };
    }

    logger.info(`addMonitoredAccount: ${username} for user ${userId}`);

    // Call Splinterlands API to validate credentials and get token
    const splResponse = await splLogin(username, timestamp, signature);

    if (!splResponse.token) {
      return { success: false, error: "No token received from Splinterlands" };
    }

    // Encrypt the token with AES-256-GCM (random IV per encryption)
    const { encryptedValue, iv, authTag } = await encryptToken(splResponse.token);

    // Add monitored account with encrypted token
    const account = await prisma.monitoredAccount.upsert({
      where: {
        userId_username: {
          userId,
          username,
        },
      },
      create: {
        userId,
        username,
        encryptedToken: encryptedValue,
        iv,
        authTag,
      },
      update: {
        encryptedToken: encryptedValue,
        iv,
        authTag,
      },
    });

    logger.info(`Monitored account ${username} added successfully`);

    return {
      success: true,
      accountId: account.id,
      username: account.username,
    };
  } catch (error) {
    logger.error(`addMonitoredAccount error: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get current user's info
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    logger.error(`getCurrentUser error: ${error}`);
    return null;
  }
}

/**
 * Get all monitored accounts for current user
 */
export async function getMonitoredAccounts() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;

    if (!userId) {
      return [];
    }

    const accounts = await prisma.monitoredAccount.findMany({
      where: { userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
      orderBy: { username: "asc" },
    });

    return accounts;
  } catch (error) {
    logger.error(`getMonitoredAccounts error: ${error}`);
    return [];
  }
}

/**
 * Remove a monitored account
 */
export async function removeMonitoredAccount(accountId: string) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;

    if (!userId) {
      return { success: false, error: "Not logged in" };
    }

    await prisma.monitoredAccount.delete({
      where: {
        id: accountId,
        userId, // Ensure user owns this account
      },
    });

    logger.info(`Monitored account ${accountId} removed`);

    return { success: true };
  } catch (error) {
    logger.error(`removeMonitoredAccount error: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Logout current user
 */
export async function logout() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(USER_COOKIE);

    return { success: true };
  } catch (error) {
    logger.error(`logout error: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get decrypted token for a user (internal use only)
 */
export async function getUserToken(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        encryptedToken: true,
        iv: true,
        authTag: true,
      },
    });

    if (!user) {
      return null;
    }

    const token = await decryptToken(user.encryptedToken, user.iv, user.authTag);

    return token;
  } catch (error) {
    logger.error(`getUserToken error: ${error}`);
    return null;
  }
}

/**
 * Get decrypted token for a monitored account (internal use only)
 */
export async function getMonitoredAccountToken(accountId: string): Promise<string | null> {
  try {
    const account = await prisma.monitoredAccount.findUnique({
      where: { id: accountId },
      select: {
        encryptedToken: true,
        iv: true,
        authTag: true,
      },
    });

    if (!account) {
      return null;
    }

    const token = await decryptToken(account.encryptedToken, account.iv, account.authTag);

    return token;
  } catch (error) {
    logger.error(`getMonitoredAccountToken error: ${error}`);
    return null;
  }
}
