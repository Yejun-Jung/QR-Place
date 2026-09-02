import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { getOrCreateUserByKakaoId } from "@/lib/db";

interface KakaoProfile {
  id: number;
  kakao_account?: { profile?: { nickname?: string } };
  properties?: { nickname?: string };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const kakaoProfile = profile as unknown as KakaoProfile;
        const kakaoId = String(kakaoProfile.id);
        const nickname =
          kakaoProfile.kakao_account?.profile?.nickname ??
          kakaoProfile.properties?.nickname ??
          null;
        const user = await getOrCreateUserByKakaoId(kakaoId, nickname);
        token.userId = user.id;
        token.nickname = user.nickname;
      }
      return token;
    },
    async session({ session, token }) {
      const jwt = token as unknown as {
        userId?: number;
        nickname?: string | null;
      };
      if (session.user && jwt.userId != null) {
        const user = session.user as unknown as {
          id: number;
          nickname: string | null;
        };
        user.id = jwt.userId;
        user.nickname = jwt.nickname ?? null;
      }
      return session;
    },
  },
});
