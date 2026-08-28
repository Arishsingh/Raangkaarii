import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

/** Split-screen frame shared by the sign-in and sign-up pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="font-script text-3xl leading-none">
          Rangkaarii
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <Image
          src="/hero-3.webp"
          alt="Woman choosing a piece from a linen-filled wardrobe"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-x-8 bottom-8 rounded-xl bg-black/45 p-7 text-white backdrop-blur-sm">
          <p className="font-serif text-2xl leading-snug">
            “The embroidery is even lovelier in person. I have worn mine every
            week since it arrived.”
          </p>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-lg font-light">Meher K.</p>
              <p className="text-sm font-light text-white/70">Jammu</p>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-4 fill-white" strokeWidth={0} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
