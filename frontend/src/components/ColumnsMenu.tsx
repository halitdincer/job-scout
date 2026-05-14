import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ColumnsMenuOption = {
  field: string;
  label: string;
};

type Props = {
  options: ColumnsMenuOption[];
  visibility: Record<string, boolean>;
  onToggle: (field: string, nextVisible: boolean) => void;
};

export function ColumnsMenu({ options, visibility, onToggle }: Props) {
  const visibleCount = options.filter((o) => visibility[o.field]).length;
  const total = options.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" aria-label="Columns">
          Columns
          <span
            aria-label={`${visibleCount} of ${total} columns visible`}
            className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs text-muted-foreground"
          >
            {visibleCount}/{total}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => {
          const checked = !!visibility[opt.field];
          return (
            <DropdownMenuCheckboxItem
              key={opt.field}
              checked={checked}
              onSelect={(event) => {
                // Keep the menu open while the user toggles multiple columns.
                event.preventDefault();
                onToggle(opt.field, !checked);
              }}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
