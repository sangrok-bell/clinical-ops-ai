import { cn } from "@/lib/utils";

// Decorative, offline-safe gradient palette (raw hex pairs, not design tokens).
const GRADIENTS: [string, string][] = [
  ["#F08A3C", "#E85FB0"],
  ["#4C7DF0", "#3FD0C9"],
  ["#3FCF8E", "#2BBE6E"],
  ["#9A6CF0", "#E85FB0"],
  ["#3FD0C9", "#4C7DF0"],
  ["#F0556A", "#F08A3C"],
];

// Deterministic hash → same seed always yields the same gradient.
function pick(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[h % GRADIENTS.length];
}

export function Avatar({
  name,
  size = 48,
  src,
  className,
}: {
  name: string;
  size?: number;
  src?: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-white/10", className)}
      />
    );
  }
  const [a, b] = pick(name);
  return (
    <div
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white/10",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundImage: `linear-gradient(135deg, ${a}, ${b})`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function Thumbnail({
  seed,
  size = 48,
  src,
  className,
}: {
  seed: string;
  size?: number;
  src?: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className={cn("shrink-0 rounded-xl object-cover ring-1 ring-white/10", className)}
      />
    );
  }
  const [a, b] = pick(seed);
  return (
    <div
      aria-hidden
      className={cn("shrink-0 rounded-xl ring-1 ring-white/10", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, ${a}, ${b})`,
      }}
    />
  );
}
