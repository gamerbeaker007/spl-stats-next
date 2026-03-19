import NextAuth from "next-auth";

// No OAuth providers — authentication is handled via Hive Keychain.
// NextAuth is kept for the route handler infrastructure.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
});
