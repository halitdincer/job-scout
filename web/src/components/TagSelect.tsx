import { useState } from 'react';
import { Tag } from '../types';

interface TagSelectProps {
  selected: string[];
  onChange: (tagIds: string[]) => void;
  tags: Tag[];
}

export default function TagSelect({ selected, onChange, tags }: TagSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  const selectedTags = tags.filter((t) => selected.includes(t.id));

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="tag-badge"
            style={{ backgroundColor: tag.color, color: '#fff', cursor: 'pointer' }}
            onClick={() => toggle(tag.id)}
            title={`Remove ${tag.name}`}
          >
            {tag.name} ×
          </span>
        ))}
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => setOpen((o) => !o)}
        >
          + Tag
        </button>
      </div>

      {open && (
        <div className="combobox-dropdown" style={{ minWidth: 160 }}>
          {tags.length === 0 && (
            <div className="combobox-item combobox-item-muted">No tags yet</div>
          )}
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`combobox-item${selected.includes(tag.id) ? ' combobox-item-selected' : ''}`}
              onClick={() => { toggle(tag.id); setOpen(false); }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: tag.color,
                  marginRight: 6,
                  flexShrink: 0,
                }}
              />
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
