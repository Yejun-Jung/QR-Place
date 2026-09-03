import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AppHeader from "@/app/ui/AppHeader";
import KakaoLoginCard from "@/app/ui/KakaoLoginCard";
import { getStoreByOwner } from "@/lib/db";

export default async function DashboardEntryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <AppHeader title="점주 로그인" back={false} />
        <KakaoLoginCard
          message="카카오 계정으로 로그인하면 내 매장 대시보드로 이동합니다."
          redirectTo="/dashboard"
        />
      </>
    );
  }

  const store = await getStoreByOwner(session.user.id);
  redirect(store ? `/dashboard/${store.id}` : "/dashboard/new");
}
