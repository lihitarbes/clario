import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  /** thumbnail | tile | card | preview */
  size?: "thumb" | "tile" | "card" | "preview";
  className?: string;
};

const sizeClassName = {
  thumb: "h-14 w-14",
  tile: "aspect-square w-full",
  card: "aspect-[4/3] w-full",
  preview: "h-40 w-40",
} as const;

export function ProductImage({
  src,
  alt,
  size = "thumb",
  className,
}: ProductImageProps) {
  const frameClass = cn(
    "overflow-hidden rounded-md border border-zinc-200 bg-zinc-100",
    sizeClassName[size],
    className,
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs
      <img
        src={src}
        alt={alt}
        className={cn(frameClass, "object-cover")}
      />
    );
  }

  return (
    <div
      className={cn(
        frameClass,
        "flex items-center justify-center text-zinc-400",
      )}
      aria-label={`${alt} (no image)`}
      role="img"
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(
          "text-zinc-400",
          size === "thumb" ? "h-6 w-6" : size === "tile" ? "h-8 w-8" : "h-10 w-10",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m8 14 2.2-2.2a1 1 0 0 1 1.4 0L14 14l1.3-1.3a1 1 0 0 1 1.4 0L18 14"
        />
        <circle cx="9" cy="9" r="1.25" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
