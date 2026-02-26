import { useEffect, useRef, useState } from 'react';

export interface ComboboxOption {
  id: string;
  label: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string, id?: string) => void;
  suggestions: ComboboxOption[];
  onCreateNew?: (label: string) => void;
  placeholder?: string;
  loading?: boolean;
  onQueryChange?: (q: string) => void;
}

export default function Combobox({
  value,
  onChange,
  suggestions,
  onCreateNew,
  placeholder = 'Type to search…',
  loading = false,
  onQueryChange,
}: ComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync query when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    onQueryChange?.(q);
    if (!q) onChange('');
  }

  function handleSelect(opt: ComboboxOption) {
    setQuery(opt.label);
    setOpen(false);
    onChange(opt.label, opt.id);
  }

  function handleCreateNew() {
    if (!query.trim()) return;
    setOpen(false);
    onCreateNew?.(query.trim());
  }

  const showCreate = onCreateNew && query.trim() && !suggestions.some(
    (s) => s.label.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (suggestions.length > 0 || showCreate || loading) && (
        <div className="combobox-dropdown">
          {loading && <div className="combobox-item combobox-item-muted">Loading…</div>}
          {suggestions.map((opt) => (
            <button
              key={opt.id}
              className="combobox-item"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
              type="button"
            >
              {opt.label}
            </button>
          ))}
          {showCreate && (
            <button
              className="combobox-item combobox-item-create"
              onMouseDown={(e) => { e.preventDefault(); handleCreateNew(); }}
              type="button"
            >
              Create "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
