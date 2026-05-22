/**
 * NextAuth 핸들러 (placeholder).
 *
 * 실제 운영 환경에서는 providers (Credentials, Google, GitHub, Kakao)와
 * NestJS gateway 콜백을 연결한다.
 * 본 데모는 빌드만 통과시키기 위한 최소 핸들러.
 */
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // TODO: NestJS gateway에 인증 요청
        if (credentials?.email && credentials?.password) {
          return { id: "demo", email: credentials.email, name: "Demo User" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
