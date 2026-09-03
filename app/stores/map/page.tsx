import { auth, signIn } from "@/auth";
import AppHeader from "@/app/ui/AppHeader";
import { getVisitedStoresByUser } from "@/lib/db";
import MapCanvas from "./MapCanvas";

export default async function MyMapPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <AppHeader title="내 맛집 지도" />
        <div className="section">
          <p className="muted" style={{ marginTop: 0 }}>
            카카오 계정으로 로그인하면 지금까지 둘러본 매장을 지도에서 볼 수
            있어요.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("kakao", { redirectTo: "/stores/map" });
            }}
          >
            <button className="btn" type="submit">
              카카오로 로그인
            </button>
          </form>
        </div>
      </>
    );
  }

  const stores = await getVisitedStoresByUser(session.user.id);

  if (stores.length === 0) {
    return (
      <>
        <AppHeader title="내 맛집 지도" />
        <p className="empty">
          아직 다녀온 맛집이 없어요.
          <br />
          매장에서 메뉴를 둘러보면 여기에 표시돼요.
        </p>
      </>
    );
  }

  return (
    <>
      <AppHeader title="내 맛집 지도" sub={`${stores.length}곳`} />
      <MapCanvas stores={stores} />
    </>
  );
}
