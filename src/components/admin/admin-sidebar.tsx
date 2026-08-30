"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  CreditCard,
  Home,
  IndianRupee,
  Menu,
  PackagePlus,
  ShoppingBag,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Main menu",
    items: [
      { href: "/admin", label: "Add product", icon: PackagePlus, exact: true },
      { href: "/admin/products", label: "Products on site", icon: Boxes },
      { href: "/admin/orders", label: "Orders on site", icon: ShoppingBag },
      { href: "/admin/razorpay", label: "Razorpay Payments", icon: CreditCard },
      { href: "/admin/users", label: "Users on site", icon: Users },
      { href: "/admin/revenue", label: "Revenue", icon: IndianRupee },
    ],
  },
  {
    label: "Storefront",
    items: [
      { href: "/dashboard", label: "View the shop", icon: Store },
      { href: "/", label: "Back to site", icon: Home },
    ],
  },
];

/** The section title shown in the layout's breadcrumb. */
export function useSectionLabel() {
  const pathname = usePathname();
  const match = GROUPS[0].items.find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
  );
  return match?.label ?? "Admin";
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map(({ href, label, icon: Icon, exact }) => {
              const active = exact
                ? pathname === href
                : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-primary font-medium text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3 pb-6">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-script text-lg leading-none text-primary-foreground">
        R
      </span>
      <span className="font-heading text-sm font-medium">Store control</span>
    </div>
  );
}

/** Desktop rail. Sticks below the 5rem site header and scrolls on its own. */
export function AdminSidebar() {
  return (
    <aside className="sticky top-20 hidden h-[calc(100dvh-5rem)] w-60 shrink-0 overflow-y-auto border-r border-border bg-card px-3 py-6 lg:block">
      <Brand />
      <NavItems />
    </aside>
  );
}

/** Below lg the same nav lives behind a menu button. */
export function AdminSidebarMobile() {
  const [open, setOpen] = React.useState(false);
  const section = useSectionLabel();

  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="Open admin menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 px-3 py-6">
          <SheetTitle className="sr-only">Admin sections</SheetTitle>
          <Brand />
          <NavItems onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <span className="text-sm font-medium">{section}</span>
    </div>
  );
}
