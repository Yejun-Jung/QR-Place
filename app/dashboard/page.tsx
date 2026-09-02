import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import AppHeader from "@/app/ui/AppHeader";
import { getStoreByOwner } from "@/lib/db";

export default async function DashboardEntryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <AppHeader title="점주 로그인" back={false} />
        <div className="section">
          <p className="muted" style={{ marginTop: 0 }}>
            카카오 계정으로 로그인하면 내 매장 대시보드로 이동합니다.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("kakao", { redirectTo: "/dashboard" });
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

  const store = await getStoreByOwner(session.user.id);
  redirect(store ? `/dashboard/${store.id}` : "/dashboard/new");
}
