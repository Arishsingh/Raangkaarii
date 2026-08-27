"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Heart,
  Menu,
  Package as PackageIcon,
  ShoppingBag,
  User,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { slugify } from "@/lib/collections";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; children?: string[]; mega?: boolean };

const nav: NavItem[] = [
  { label: "SALE", href: "/collections/sale" },
  { label: "New In", href: "/collections/new-in", children: ["This Week", "Back in Stock", "Pre-Order"] },
  { label: "Womens", href: "/collections/womens", mega: true },
];

/** Link columns of the Womens mega menu, grouped as they appear left to right. */
const womensMega: { heading: string; links: string[] }[][] = [
  [
    { heading: "Shop", links: ["SALE", "New In", "Best Sellers", "Shop All Pyjama Sets", "E-Gift Card"] },
    {
      heading: "Shop by Style",
      links: [
        "Traditional Long Pyjamas",
        "Short Pyjamas",
        "Oversized Pyjamas",
        "Capri Pyjamas",
        "Dressing Gowns & Robes",
        "Nightdresses & Shirts",
        "Separates",
      ],
    },
  ],
  [{ heading: "Shop by Fabric", links: ["Cotton", "Cotton Voile", "Cotton Gauze", "Satin", "Linen Blend"] }],
  [
    {
      heading: "Shop by Collection",
      links: [
        "Rangkaarii X French Bedroom",
        "Holiday Shop",
        "Animal & Feather Print Nightwear",
        "Striped Nightwear",
        "Gingham & Checked Nightwear",
        "Floral Nightwear",
        "Matching Family Pyjamas",
        "Bridal Party Pyjamas",
        "Maternity Pyjamas",
      ],
    },
  ],
];

/** `solid` renders the opaque page header; the default overlays the hero. */
export function SiteHeader({
  solid = false,
  locked = false,
  admin = false,
}: {
  solid?: boolean;
  /** Dashboard shell: hides every route back into the storefront. */
  locked?: boolean;
  /** Set by pages that have already checked the signed-in user server-side. */
  admin?: boolean;
}) {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const lovedCount = useWishlist()?.items.length ?? 0;
  const cartCount = useCart()?.count ?? 0;
  const [megaOpen, setMegaOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMega = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  }, []);

  const closeMega = React.useCallback((delay = 0) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMegaOpen(false), delay);
  }, []);

  React.useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <header
      className={cn(
        "z-50",
        solid
          ? "sticky top-0 border-b bg-background text-foreground"
          : "absolute inset-x-0 top-0 text-white",
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeMega(0);
      }}
    >
      <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center gap-6 px-5 sm:px-8">
        {/* Mobile menu */}
        {locked ? null : (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className={cn("lg:hidden", !solid && "text-white hover:bg-white/15 hover:text-white")}
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px]">
            <SheetHeader>
              <SheetTitle className="font-script text-3xl font-normal">
                Rangkaarii
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-4 pb-6">
              {nav.map((item) => (
                <React.Fragment key={item.label}>
                  <Link
                    href={item.href}
                    className="py-3 text-sm tracking-wide text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                  <Separator />
                </React.Fragment>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        )}

        {locked ? (
          <span className="inline-flex items-center font-script text-3xl leading-none tracking-wide drop-shadow-sm pointer-coarse:py-1.5 sm:text-4xl lg:mr-4">
            Rangkaarii
          </span>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center font-script text-3xl leading-none tracking-wide drop-shadow-sm pointer-coarse:py-1.5 sm:text-4xl lg:mr-4"
          >
            Rangkaarii
          </Link>
        )}

        <nav
          className={cn(
            "hidden flex-1 items-center gap-7 lg:flex",
            locked && "lg:hidden",
          )}
        >
          {nav.map((item) =>
            item.mega ? (
              <div
                key={item.label}
                onMouseEnter={openMega}
                onMouseLeave={() => closeMega()}
                /* Full header height so there is no dead gap above the panel. */
                className="flex h-20 items-center"
              >
                <Link
                  href={item.href}
                  aria-expanded={megaOpen}
                  onFocus={openMega}
                  className="group flex items-center gap-1 text-[15px] font-light tracking-wide outline-none transition-opacity hover:opacity-75 focus-visible:opacity-75"
                >
                  {item.label}
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform duration-200",
                      megaOpen && "rotate-180",
                    )}
                  />
                </Link>
              </div>
            ) : item.children ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger className="group flex items-center gap-1 text-[15px] font-light tracking-wide outline-none transition-opacity hover:opacity-75 focus-visible:opacity-75">
                  {item.label}
                  <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-44">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child} asChild>
                      <Link href={`/collections/${slugify(child)}`}>{child}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="text-[15px] font-light tracking-wide transition-opacity hover:opacity-75"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div
          className={cn(
            "ml-auto flex flex-1 items-center justify-end gap-0.5",
            locked ? "ml-auto" : "lg:ml-0 lg:flex-none",
          )}
        >
          {locked ? (
            <Button
              asChild
              variant="ghost"
              className={cn(
                "gap-2 px-2.5 sm:px-3",
                !solid && "text-white hover:bg-white/15 hover:text-white",
              )}
            >
              <Link href="/dashboard/orders" aria-label="Your orders">
                <PackageIcon className="size-5" />
                <span className="hidden text-sm font-light sm:inline">Orders</span>
              </Link>
            </Button>
          ) : null}

          {locked ? (
            <Button
              asChild
              variant="ghost"
              className={cn(
                "gap-2 px-2.5 sm:px-3",
                !solid && "text-white hover:bg-white/15 hover:text-white",
              )}
            >
              <Link href="/dashboard?view=loved" aria-label="Your loved pieces">
                <Heart className="size-5" />
                <span className="hidden text-sm font-light sm:inline">Loved</span>
                {lovedCount > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
                    {lovedCount}
                  </span>
                ) : null}
              </Link>
            </Button>
          ) : null}

          {locked ? (
            <Button
              asChild
              variant="ghost"
              className={cn(
                "gap-2 px-2.5 sm:px-3",
                !solid && "text-white hover:bg-white/15 hover:text-white",
              )}
            >
              <Link href="/dashboard/cart" aria-label="Your cart">
                <ShoppingBag className="size-5" />
                <span className="hidden text-sm font-light sm:inline">Cart</span>
                {cartCount > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </Button>
          ) : null}

          {isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Account menu"
                  data-account
                  className={cn(
                    "gap-2 px-2.5 sm:px-3",
                    locked && "ml-auto",
                    !solid && "text-white hover:bg-white/15 hover:text-white",
                  )}
                >
                  <User className="size-5" />
                  <span className="hidden text-sm font-light sm:inline">
                    Account
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs font-light text-foreground/60">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {locked ? null : (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Your account</Link>
                  </DropdownMenuItem>
                )}
                {admin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Store control</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              variant="ghost"
              className={cn(
                "gap-2 px-2.5 sm:px-3",
                !solid && "text-white hover:bg-white/15 hover:text-white",
              )}
            >
              <Link href="/sign-in" aria-label="Login">
                <User className="size-5" />
                <span className="hidden text-sm font-light sm:inline">Login</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Womens mega menu */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-20 hidden lg:block",
          "transition-[opacity,transform] duration-150",
          megaOpen ? "opacity-100" : "-translate-y-1 opacity-0",
        )}
        aria-hidden={!megaOpen}
      >
        <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8">
          <div
            onMouseEnter={openMega}
            onMouseLeave={() => closeMega()}
            className={cn(
              "flex w-fit max-w-full overflow-hidden rounded-md border bg-background text-foreground shadow-xl",
              megaOpen && "pointer-events-auto",
            )}
          >
            <div className="flex divide-x">
              {womensMega.map((column, columnIndex) => (
                <div key={columnIndex} className="flex flex-col gap-7 px-7 py-7">
                  {column.map((group) => (
                    <div key={group.heading}>
                      <h3 className="mb-2.5 text-sm font-medium tracking-wide">
                        {group.heading}
                      </h3>
                      <ul className="flex flex-col gap-1.5">
                        {group.links.map((link) => (
                          <li key={link}>
                            <Link
                              href={`/collections/${slugify(link)}`}
                              onClick={() => closeMega()}
                              className="whitespace-nowrap text-[13px] font-light text-foreground/70 transition-colors hover:text-foreground"
                            >
                              {link}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <Link
              href="/collections/womens"
              onClick={() => closeMega()}
              className="group relative hidden w-[240px] shrink-0 overflow-hidden xl:block"
            >
              <Image
                src="/hero-3.png"
                alt="Woman choosing a piece from a linen-filled wardrobe"
                fill
                sizes="240px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute bottom-5 left-5 bg-white/95 px-4 py-2 text-[10px] font-medium tracking-[0.18em] text-neutral-900 shadow-sm transition-colors group-hover:bg-white">
                SHOP NOW
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
