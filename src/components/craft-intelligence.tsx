import Image from "next/image";
import Link from "next/link";

const cards = [
  {
    title: "Thread Library",
    headline: "Every motif has an origin.",
    description:
      "Each print and stitch is traced back to the region and workshop it came from, so you know the story behind the piece you wear.",
    image: "/products/01.webp",
    alt: "Close detail of hand embroidery on a rose pink kurta",
  },
  {
    title: "Fit Guide",
    headline: "Find the cut that suits you.",
    description:
      "Measurements, drape notes, and model sizing for every silhouette — from traditional long sets to oversized separates.",
    image: "/products/03.webp",
    alt: "Mint floral kurta with a lace trim held up in the studio",
  },
  {
    title: "Fabric Notes",
    headline: "Know what you're wearing.",
    description:
      "Cotton voile, gauze, satin, and linen blend compared on weight, breathability, and how each one softens with wear.",
    image: "/products/13.webp",
    alt: "Sage green kurta with a pearl-worked neckline",
  },
  {
    title: "Care & Repair",
    headline: "Made to last past the season.",
    description:
      "Washing guidance for hand-finished embroidery, plus a repair service for the pieces you are not ready to give up.",
    image: "/products/15.webp",
    alt: "Deep red kurta with gold zari embroidery",
  },
];

export function CraftIntelligence() {
  return (
    <section className="pb-16 sm:pb-24">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="inline-flex rounded-full bg-foreground px-5 py-2.5 text-xs font-medium tracking-wide text-background">
              Rangkaarii Craft
            </span>
            <h2 className="mt-8 text-5xl leading-[1.1] sm:text-6xl lg:text-7xl">
              <span className="font-serif italic">Considered</span>{" "}
              <span className="font-light">clothing</span>
              <br />
              <span className="font-light">for every day.</span>
            </h2>
          </div>

          <div className="lg:pt-3">
            <h3 className="text-2xl sm:text-3xl">
              <span className="font-serif italic">Understand</span>{" "}
              <span className="font-medium">everyday wear</span>
            </h3>
            <p className="mt-5 max-w-xl text-sm font-light leading-relaxed text-foreground/75">
              Rangkaarii Craft turns the details behind each piece — the fabric, the
              stitch, the fit — into guidance you can actually use before you buy.
            </p>
            <Link
              href="/collections/womens"
              className="mt-7 inline-flex rounded-full bg-foreground px-7 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
            >
              Explore Rangkaarii Craft
            </Link>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <article key={card.title}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <h4 className="mt-5 font-serif text-2xl font-medium">{card.title}</h4>
              <p className="mt-2 text-lg font-light">{card.headline}</p>
              <p className="mt-3 text-sm font-light leading-relaxed text-foreground/70">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
