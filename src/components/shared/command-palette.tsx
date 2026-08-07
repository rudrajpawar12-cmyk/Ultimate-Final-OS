import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGlobalSearch } from "@/hooks/use-platform";

/**
 * Global search + command palette (Cmd/Ctrl+K).
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { groups, isLoading } = useGlobalSearch(query);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search jobs, candidates, interviews and tools…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{isLoading ? "Loading…" : "No results found."}</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.entity} heading={group.label}>
            {group.results.map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.title} ${result.subtitle} ${result.keywords.join(" ")}`}
                onSelect={() => {
                  onOpenChange(false);
                  void navigate({ to: result.href });
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{result.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}
