import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Combobox from './Combobox';

const suggestions = [
  { id: 'c1', label: 'Acme Corp' },
  { id: 'c2', label: 'Beta LLC' },
];

describe('Combobox', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders with placeholder', () => {
    render(<Combobox value="" onChange={vi.fn()} suggestions={[]} placeholder="Search companies…" />);
    expect(screen.getByPlaceholderText('Search companies…')).toBeInTheDocument();
  });

  it('shows suggestions when focused', () => {
    render(<Combobox value="" onChange={vi.fn()} suggestions={suggestions} />);
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
  });

  it('calls onChange with empty string when input is cleared', () => {
    const onChange = vi.fn();
    render(<Combobox value="Canada" onChange={onChange} suggestions={suggestions} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('calls onChange with label and id when suggestion selected', () => {
    const onChange = vi.fn();
    render(<Combobox value="" onChange={onChange} suggestions={suggestions} />);
    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.mouseDown(screen.getByText('Acme Corp'));
    expect(onChange).toHaveBeenCalledWith('Acme Corp', 'c1');
  });

  it('shows Create option when onCreateNew provided and no exact match', () => {
    render(<Combobox value="" onChange={vi.fn()} suggestions={[]} onCreateNew={vi.fn()} />);
    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Corp' } });
    expect(screen.getByText(/Create "New Corp"/)).toBeInTheDocument();
  });

  it('calls onCreateNew when Create option clicked', () => {
    const onCreateNew = vi.fn();
    render(<Combobox value="" onChange={vi.fn()} suggestions={[]} onCreateNew={onCreateNew} />);
    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Corp' } });
    fireEvent.mouseDown(screen.getByText(/Create "New Corp"/));
    expect(onCreateNew).toHaveBeenCalledWith('New Corp');
  });

  it('shows loading indicator when loading=true and dropdown is open', () => {
    render(<Combobox value="" onChange={vi.fn()} suggestions={[]} loading={true} />);
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('does not show Create when input exactly matches a suggestion', () => {
    render(
      <Combobox
        value=""
        onChange={vi.fn()}
        suggestions={[{ id: 'x', label: 'Acme Corp' }]}
        onCreateNew={vi.fn()}
      />
    );
    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Acme Corp' } });
    expect(screen.queryByText(/Create "Acme Corp"/)).not.toBeInTheDocument();
  });

  it('calls onQueryChange when typing', () => {
    const onQueryChange = vi.fn();
    render(<Combobox value="" onChange={vi.fn()} suggestions={[]} onQueryChange={onQueryChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
    expect(onQueryChange).toHaveBeenCalledWith('abc');
  });

  it('syncs input when value prop changes', () => {
    const { rerender } = render(<Combobox value="foo" onChange={vi.fn()} suggestions={[]} />);
    expect(screen.getByRole('textbox')).toHaveValue('foo');
    rerender(<Combobox value="bar" onChange={vi.fn()} suggestions={[]} />);
    expect(screen.getByRole('textbox')).toHaveValue('bar');
  });
});
