import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

/* ------------------------------- Text field -------------------------------- */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength = 120,
  required,
  hint,
  className,
  multiline,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  required?: boolean;
  hint?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-required={required}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-required={required}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------- Chip list --------------------------------- */

export function ChipListField({
  label,
  placeholder,
  values,
  onChange,
  suggestions,
  maxLength = 60,
  hint,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  maxLength?: number;
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value || values.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => {
            const active = values.some((item) => item.toLowerCase() === suggestion.toLowerCase());
            return (
              <button
                key={suggestion}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  active
                    ? onChange(
                        values.filter((item) => item.toLowerCase() !== suggestion.toLowerCase()),
                      )
                    : onChange([...values, suggestion])
                }
                className={cn(
                  "focus-ring min-h-9 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {suggestion}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
          }}
        />
        <Button type="button" variant="outline" disabled={!draft.trim()} onClick={() => add(draft)}>
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((item) => (
            <li key={item}>
              <Badge variant="secondary" className="rounded-full py-1 pl-3 pr-1.5">
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  className="focus-ring ml-1 grid size-5 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => onChange(values.filter((value) => value !== item))}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- Record editor -------------------------------- */

export interface RecordFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  full?: boolean;
  maxLength?: number;
}

export interface RecordItem {
  id: string;
}

/**
 * Reusable repeatable-record editor used by education, experience, projects
 * and certification steps. Keeps every list step consistent and accessible.
 */
export function RecordEditor<T extends RecordItem>({
  fields,
  items,
  onAdd,
  onRemove,
  addLabel,
  emptyTitle,
  emptyDescription,
  renderSummary,
}: {
  fields: RecordFieldConfig[];
  items: T[];
  onAdd: (draft: Record<string, string>) => void;
  onRemove: (id: string) => void;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  renderSummary: (item: T) => ReactNode;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const submit = () => {
    const missing = fields.find((field) => field.required && !draft[field.name]?.trim());
    if (missing) {
      setMessage(`${missing.label} is required.`);
      return;
    }
    setMessage(null);
    onAdd(draft);
    setDraft({});
    firstFieldRef.current?.focus();
  };

  return (
    <div className="space-y-5">
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} className="py-10" />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0 text-sm">{renderSummary(item)}</div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove entry"
                className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="space-y-4 rounded-2xl border border-dashed border-border p-4">
        <legend className="px-1 text-sm font-semibold">{addLabel}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field, fieldIndex) => (
            <div
              key={field.name}
              className={cn("space-y-2", (field.full || field.multiline) && "sm:col-span-2")}
            >
              <Label htmlFor={`record-${field.name}`}>
                {field.label}
                {field.required && <span className="ml-0.5 text-destructive">*</span>}
              </Label>
              {field.multiline ? (
                <Textarea
                  id={`record-${field.name}`}
                  rows={3}
                  maxLength={field.maxLength ?? 600}
                  placeholder={field.placeholder}
                  value={draft[field.name] ?? ""}
                  onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
                />
              ) : (
                <Input
                  id={`record-${field.name}`}
                  ref={fieldIndex === 0 ? (node) => void (firstFieldRef.current = node) : undefined}
                  type={field.type ?? "text"}
                  maxLength={field.maxLength ?? 120}
                  placeholder={field.placeholder}
                  aria-required={field.required}
                  value={draft[field.name] ?? ""}
                  onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        {message && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {message}
          </p>
        )}
        <Button type="button" variant="outline" onClick={submit}>
          <Plus className="size-4" aria-hidden="true" />
          {addLabel}
        </Button>
      </fieldset>
    </div>
  );
}

/* ----------------------------- Image uploader ------------------------------- */

export function ImageUploadField({
  label,
  description,
  value,
  onChange,
  shape = "circle",
  fallback,
}: {
  label: string;
  description: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  shape?: "circle" | "square";
  fallback: ReactNode;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Upload a PNG, JPG or SVG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2 MB.");
      return;
    }
    setError(null);
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === "string" ? reader.result : undefined);
      setBusy(false);
    };
    reader.onerror = () => {
      setError("We couldn't read that file. Try again.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <span
          className={cn(
            "grid size-24 shrink-0 place-items-center overflow-hidden border border-border bg-muted text-muted-foreground",
            shape === "circle" ? "rounded-full" : "rounded-2xl",
          )}
        >
          {value ? (
            <img src={value} alt={`${label} preview`} className="size-full object-cover" />
          ) : (
            fallback
          )}
        </span>
        <div className="space-y-2 text-center sm:text-left">
          <Label htmlFor={id} className="text-base">
            {label}
          </Label>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button type="button" variant="outline" asChild>
              <label htmlFor={id} className="cursor-pointer">
                <ImagePlus className="size-4" aria-hidden="true" />
                {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
              </label>
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={() => onChange(undefined)}>
                Remove
              </Button>
            )}
          </div>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ Option group -------------------------------- */

export function OptionGroup({
  label,
  options,
  value,
  onChange,
  multiple,
  columns = 2,
}: {
  label: string;
  options: { value: string; title: string; description?: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  columns?: 1 | 2 | 3;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{label}</legend>
      <div
        role={multiple ? "group" : "radiogroup"}
        aria-label={label}
        className={cn(
          "grid gap-3",
          columns === 1 && "sm:grid-cols-1",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {options.map((option) => {
          const active = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={active}
              onClick={() =>
                multiple
                  ? onChange(
                      active
                        ? value.filter((item) => item !== option.value)
                        : [...value, option.value],
                    )
                  : onChange([option.value])
              }
              className={cn(
                "focus-ring min-h-11 rounded-xl border px-4 py-3 text-left transition-colors",
                active ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
              )}
            >
              <span className={cn("block text-sm font-semibold", active && "text-primary")}>
                {option.title}
              </span>
              {option.description && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
