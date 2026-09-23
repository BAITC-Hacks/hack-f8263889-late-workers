import { cn } from "@/common/lib/utils";

const GAP = {
  xs: "space-y-1",
  sm: "space-y-2",
  md: "space-y-4",
  lg: "space-y-6",
  xl: "space-y-8",
} as const;

type StackProps = {
  gap?: keyof typeof GAP;
  className?: string;
  children: React.ReactNode;
};

export const Stack = ({ gap = "md", className, children }: StackProps) => (
  <div className={cn(GAP[gap], className)}>{children}</div>
);
