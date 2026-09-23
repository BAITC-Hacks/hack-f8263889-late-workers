import { TopBar } from "@/common/components/TopBar";
import { cn } from "@/common/lib/utils";

type PageProps = {
  className?: string;
  children: React.ReactNode;
};

export const Page = ({ className, children }: PageProps) => (
  <div className="min-h-screen">
    <TopBar />
    <main className={cn("w-full px-6 py-12 sm:px-10", className)}>
      {children}
    </main>
  </div>
);
