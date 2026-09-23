import { cn } from "@/common/lib/utils";
import { sectionDescription, sectionTitle } from "@/common/styles";
import { motion } from "framer-motion";

type SectionProps = {
  title?: string;
  description?: string;
  divider?: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
};

export const Section = ({
  title,
  description,
  divider = true,
  delay = 0,
  className,
  children,
}: SectionProps) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className={cn(divider && "mt-24 border-t pt-10", className)}
  >
    {(title || description) && (
      <div className="mb-6">
        {title && <h2 className={sectionTitle}>{title}</h2>}
        {description && <p className={sectionDescription}>{description}</p>}
      </div>
    )}
    {children}
  </motion.section>
);
