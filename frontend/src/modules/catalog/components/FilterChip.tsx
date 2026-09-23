type FilterChipProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
};

/**
 * A native checkbox stretched invisibly over a chip: it keeps keyboard and
 * screen reader behavior and receives the click anywhere on the chip.
 */
export const FilterChip = ({ label, checked, onChange }: FilterChipProps) => (
  <label className="relative inline-flex cursor-pointer">
    <input
      type="checkbox"
      className="peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      checked={checked}
      onChange={onChange}
    />
    <span className="text-muted-foreground hover:border-primary hover:text-foreground peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-ring inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors peer-focus-visible:ring-1 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
      {label}
    </span>
  </label>
);
