import Link from "next/link";
import { LazyVideo } from "@/components/lazy-video";

/**
 * Background clips live in /public/videos. Until a clip is added the poster
 * image stands in, so the section renders correctly either way.
 */
const features = [
  {
    emphasis: "Hand-Embroidered",
    title: "Everyday Kurta Sets",
    description: "Thread work finished by hand, cut for the long way home",
    video: "/videos/kurta-sets.mp4",
    poster: "/hero-2.webp",
    href: "/collections/womens",
  },
  {
    emphasis: "Featherweight",
    title: "Cotton Voile Layers",
    description: "Breathable cotton voile made for warm afternoons",
    video: "/videos/cotton-voile.mp4",
    poster: "/hero-3.webp",
    href: "/collections/cotton-voile",
  },
  {
    emphasis: "Occasion",
    title: "Velvet & Organza",
    description: "Gold thread and deep crimson, cut for evening light",
    video: "/videos/velvet-organza.mp4",
    poster: "/hero-4.webp",
    href: "/collections/satin",
  },
];

export function FeatureVideos() {
  return (
    <section className="pb-16 sm:pb-24">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8">
        <h2 className="mb-8 text-center font-serif text-3xl font-medium uppercase tracking-[0.02em] sm:text-4xl">
          Build Your Rangkaarii Edit
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative aspect-[5/7] overflow-hidden rounded-2xl bg-muted"
            >
              <LazyVideo
                src={feature.video}
                poster={feature.poster}
                className="transition-transform duration-700 group-hover:scale-[1.03]"
              />

              {/* Scrims so the copy stays readable over any frame. */}
              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/55 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

              <h3 className="absolute inset-x-6 top-6 text-3xl leading-tight text-white sm:text-4xl">
                <span className="font-serif italic">{feature.emphasis}</span>{" "}
                <span className="font-light">{feature.title}</span>
              </h3>

              <div className="absolute inset-x-6 bottom-6">
                <p className="text-sm font-light leading-relaxed text-white/90">
                  {feature.description}
                </p>
                <Link
                  href={feature.href}
                  className="mt-4 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-white/90"
                >
                  Learn More
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
