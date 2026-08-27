import Link from "next/link";

export default function AuthLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-semibold text-zinc-900">
          Clario
        </Link>
        <p className="mt-2 text-sm text-zinc-600">
          Client management for service-based businesses
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
