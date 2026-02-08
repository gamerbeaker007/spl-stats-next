import { AuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: AuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedUsers = process.env.GITHUB_ALLOWED_USERS?.split(",") ?? [];
      return allowedUsers.includes(user.name ?? "");
    },
    async session({ session }) {
      return session;
    },
  },
};
