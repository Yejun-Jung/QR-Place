import { signIn } from "@/auth";

/**
 * 카카오 로그인 전용 카드. /dashboard, /stores/map 등 "로그인해야 이 화면을
 * 쓸 수 있음" 페이지에서 공통으로 쓴다. 서버 액션으로 로그인 트리거.
 */
export default function KakaoLoginCard({
  message,
  redirectTo,
}: {
  message: string;
  redirectTo: string;
}) {
  return (
    <div className="section">
      <div className="login-card">
        <h2>로그인</h2>
        <p className="muted">{message}</p>
        <form
          action={async () => {
            "use server";
            await signIn("kakao", { redirectTo });
          }}
        >
          <button className="btn kakao" type="submit">
            <span aria-hidden="true">💬</span> 카카오 로그인
          </button>
        </form>
        <p className="login-caption">간편하게 카카오 계정으로 로그인하세요</p>
      </div>
    </div>
  );
}
