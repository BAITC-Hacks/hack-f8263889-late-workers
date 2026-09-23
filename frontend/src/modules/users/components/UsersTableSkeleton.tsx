import { cn } from "@/common/lib/utils";
import { skeleton, tableCell } from "@/common/styles";

const ROWS = 5;
const COLUMN_WIDTHS = [
  "w-24",
  "w-28",
  "w-44",
  "w-32",
  "w-16",
  "w-20",
  "w-20",
  "w-8",
];

export const UsersTableSkeleton = () => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full border-collapse text-sm">
      <tbody className="divide-y">
        {Array.from({ length: ROWS }, (_, row) => (
          <tr key={row}>
            {COLUMN_WIDTHS.map((width, column) => (
              <td key={column} className={tableCell}>
                <div className={cn(skeleton, "h-4", width)} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
