import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { formatINR } from "../lib/format";
import { mediaUrl } from "../lib/media";
import { Progress } from "./ui";

const GRADIENTS = [
  "from-neutral-800 to-neutral-950",
  "from-stone-800 to-stone-950",
  "from-zinc-800 to-zinc-950",
  "from-gray-800 to-gray-950",
];
function gradientFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export interface CourseCardData {
  title: string;
  slug: string;
  exam?: string | null;
  summary?: string | null;
  fromPrice?: number | null;
  image?: string | null;
  progress?: number;
  to?: string;
}

export default function CourseCard(c: CourseCardData) {
  const href = c.to || `/courses/${c.slug}`;
  const [imgOk, setImgOk] = useState(true);
  const imgUrl = mediaUrl(c.image);
  const showImg = !!imgUrl && imgOk;
  const priceLabel = c.fromPrice == null ? "" : c.fromPrice === 0 ? "Free" : formatINR(c.fromPrice);

  return (
    <Link to={href} className="group block">
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-card transition-all duration-300 hover:-translate-y-2 hover:border-gold-400 hover:shadow-lux">
        {/* Cover */}
        <div className="relative h-48 overflow-hidden bg-gold-50">
          {showImg ? (
            <img
              src={imgUrl as string}
              alt={c.title}
              loading="lazy"
              onError={() => setImgOk(false)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(c.slug)}`}>
              <BookOpen size={26} className="text-white/80" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col space-y-4 p-8">
          {c.exam && (
            <span className="self-start rounded-full bg-gold-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gold-700 ring-1 ring-gold-200">
              {c.exam}
            </span>
          )}
          <h3 className="font-display text-xl font-bold leading-snug text-ink">{c.title}</h3>
          {c.summary && <p className="line-clamp-2 flex-grow text-sm leading-relaxed text-muted">{c.summary}</p>}

          {c.progress !== undefined ? (
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gold-100">
                <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }} />
              </div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{c.progress}% complete</div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-gold-600 transition group-hover:text-gold-700">View Course →</span>
              <span className="font-display text-lg font-semibold text-ink">{priceLabel}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
