import { useState } from 'react';
import Combobox from './Combobox';
import { useGeoSearch } from '../hooks';
import { GeoResult } from '../types';

const TYPE_ICON: Record<GeoResult['type'], string> = {
  country: '🌍',
  state: '🗺️',
  city: '📍',
};

interface GeoComboboxProps {
  locationKey: string;
  locationLabel: string;
  onChange: (key: string, label: string) => void;
  placeholder?: string;
}

export default function GeoCombobox({
  locationKey: _locationKey,
  locationLabel,
  onChange,
  placeholder = 'Type a country, state, or city…',
}: GeoComboboxProps) {
  const [query, setQuery] = useState('');
  const { data: results, loading } = useGeoSearch(query);

  const suggestions = (results ?? []).map((r) => ({
    id: r.key,
    label: `${TYPE_ICON[r.type]} ${r.label}`,
  }));

  function handleChange(label: string, id?: string) {
    if (!id) {
      onChange('', '');
      return;
    }
    // Strip the emoji prefix from label for storage
    const cleanLabel = label.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\s]+/u, '').trim();
    onChange(id, cleanLabel);
  }

  return (
    <Combobox
      value={locationLabel}
      onChange={handleChange}
      suggestions={suggestions}
      loading={loading}
      placeholder={placeholder}
      onQueryChange={setQuery}
    />
  );
}
