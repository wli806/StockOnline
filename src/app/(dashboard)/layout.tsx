import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { SessionProvider } from "@/components/SessionProvider";
import { CurrencyProvider } from "@/components/CurrencyProvider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SessionProvider role={session.role} username={session.username}>
    <CurrencyProvider>
      <div className="flex min-h-screen">
        <Sidebar role={session.role} username={session.username} />
        <main className="ml-[220px] flex-1 min-h-screen bg-slate-50">
          {children}
        </main>
      </div>
    </CurrencyProvider>
    </SessionProvider>
  );
}
