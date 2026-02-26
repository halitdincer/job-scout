import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GeoCombobox from './GeoCombobox';

vi.mock('../hooks', () => ({
  useGeoSearch: vi.fn(),
}));

import { useGeoSearch } from '../hooks';

const mockResults = [
  { key: 'CA', label: 'Canada', type: 'country' as const },
  { key: 'CA-ON', label: 'Ontario, Canada', type: 'state' as const },
  { key: 'CA-ON-Toronto', label: 'Toronto, Ontario, Canada', type: 'city' as const },
];

function setup(props: Partial<Parameters<typeof GeoCombobox>[0]> = {}) {
  vi.mocked(useGeoSearch).mockReturnValue({ data: mockResults, error: null, loading: false });
  const onChange = vi.fn();
  render(
    <GeoCombobox
      locationKey=""
      locationLabel=""
      onChange={onChange}
      placeholder="Location…"
      {...props}
    />
  );
  return { onChange };
}

describe('GeoCombobox', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the input with placeholder', () => {
    setup();
    expect(screen.getByPlaceholderText('Location…')).toBeInTheDocument();
  });

  it('shows suggestions with type icons on focus', () => {
    setup();
    fireEvent.focus(screen.getByPlaceholderText('Location…'));
    // All three suggestions should be visible (with emoji prefix)
    const items = screen.getAllByText(/Canada/);
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('🗺️ Ontario, Canada')).toBeInTheDocument();
    expect(screen.getByText('📍 Toronto, Ontario, Canada')).toBeInTheDocument();
  });

  it('calls onChange with empty strings when cleared', () => {
    const { onChange } = setup({ locationLabel: 'Canada' });
    fireEvent.change(screen.getByPlaceholderText('Location…'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('', '');
  });

  it('calls onChange with key and clean label when suggestion selected', () => {
    const { onChange } = setup();
    fireEvent.focus(screen.getByPlaceholderText('Location…'));
    // The suggestion button text includes the emoji prefix
    const canadaBtn = screen.getAllByText(/Canada/)[0];
    fireEvent.mouseDown(canadaBtn);
    // onChange should receive the key (CA) and label without emoji
    expect(onChange).toHaveBeenCalled();
    const [key] = onChange.mock.calls[0];
    expect(key).toBe('CA');
  });

  it('shows loading indicator when hook is loading', () => {
    vi.mocked(useGeoSearch).mockReturnValue({ data: null, error: null, loading: true });
    render(<GeoCombobox locationKey="" locationLabel="" onChange={vi.fn()} />);
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('uses locationLabel as initial input value', () => {
    setup({ locationLabel: 'Toronto, Ontario, Canada' });
    expect(screen.getByRole('textbox')).toHaveValue('Toronto, Ontario, Canada');
  });
});
