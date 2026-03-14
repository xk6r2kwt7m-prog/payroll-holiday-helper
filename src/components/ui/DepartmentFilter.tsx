import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartments } from "@/hooks/useDepartments";

interface DepartmentFilterProps {
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  allLabel?: string;
  className?: string;
}

/** Reusable department dropdown that reads from the departments table */
export function DepartmentFilter({
  value,
  onChange,
  includeAll = true,
  allLabel = "All Depts",
  className = "w-[150px]",
}: DepartmentFilterProps) {
  const { data: departments = [] } = useDepartments();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Department" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">{allLabel}</SelectItem>}
        {departments.map((d) => (
          <SelectItem key={d.key} value={d.key}>
            {d.emoji} {d.key}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
