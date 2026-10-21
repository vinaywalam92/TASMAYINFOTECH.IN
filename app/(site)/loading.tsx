import { ProductGridSkeleton } from "@/components/ui/Bits";

export default function Loading() {
  return (
    <div className="container-x py-16">
      <div className="skeleton h-12 w-2/3 max-w-xl rounded-xl" />
      <div className="skeleton mt-4 h-5 w-1/2 max-w-md rounded" />
      <div className="mt-12"><ProductGridSkeleton count={8} /></div>
    </div>
  );
}
