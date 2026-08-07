import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  label?: string;
}

export function SearchBar({
  value,
  onValueChange,
  onClear,
  className,
  placeholder = "Search…",
  label = "Search",
  ...props
}: SearchBarProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
        className="h-11 rounded-xl pl-9 pr-9"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onValueChange?.("");
            onClear?.();
          }}
          className="focus-ring absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
