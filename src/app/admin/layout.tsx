import { notFound } from "next/navigation";

import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminSidebar, AdminSidebarMobile } from "@/components/admin/admin-sidebar";
import { SiteHeader } from "@/components/site-header";
import { getAdminUser } from "@/lib/admin";

export const metadata = { title: "Admin — Rangkaarii" };

// Every panel reads live user, order and catalogue data.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // One guard for the whole subtree; the Server Actions re-check independently.
  const admin = await getAdminUser();
  if (!admin) notFound();

  return (
    <>
      <SiteHeader solid locked admin />
      {/* items-start keeps the sticky rail from being stretched by the content. */}
      <div className="flex flex-1 items-start">
        <AdminSidebar />

        <div className="min-w-0 flex-1">
          <AdminSidebarMobile />
          <main className="px-5 py-8 sm:px-8">
            <header className="mb-8">
              <AdminBreadcrumb />
              <p className="mt-2 text-sm text-muted-foreground">
                Signed in as {admin.primaryEmailAddress?.emailAddress}. Everything
                you add here goes live on the site straight away.
              </p>
            </header>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
