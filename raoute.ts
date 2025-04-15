import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Log the environment variables for debugging
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...");

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/youtube.force-ssl",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        console.log("Initial sign in, setting token with access token");
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
        };
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        console.log("Token not expired, returning existing token");
        return token;
      }

      // Access token has expired, try to update it
      console.log("Token expired, should refresh but not implemented");
      return {
        ...token,
        error: "RefreshAccessTokenError"
      };
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider
      console.log("Setting session with token data:", token.accessToken ? "Access token available" : "No access token");
      
      // @ts-ignore - we know this is safe because we've defined the types in next-auth.d.ts
      session.accessToken = token.accessToken;
      
      // @ts-ignore
      session.error = token.error;
      
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour
  },
  debug: true, // Enable debug mode to see more logs
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
