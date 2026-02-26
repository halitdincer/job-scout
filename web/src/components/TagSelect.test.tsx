import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TagSelect from './TagSelect';

const tags = [
  { id: 't1', name: 'frontend', color: '#f00' },
  { id: 't2', name: 'backend', color: '#0f0' },
];

describe('TagSelect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the + Tag button', () => {
    render(<TagSelect selected={[]} onChange={vi.fn()} tags={tags} />);
    expect(screen.getByRole('button', { name: '+ Tag' })).toBeInTheDocument();
  });

  it('clicking + Tag opens the dropdown', () => {
    render(<TagSelect selected={[]} onChange={vi.fn()} tags={tags} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tag' }));
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
  });

  it('shows "No tags yet" when tags list is empty', () => {
    render(<TagSelect selected={[]} onChange={vi.fn()} tags={[]} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tag' }));
    expect(screen.getByText(/no tags yet/i)).toBeInTheDocument();
  });

  it('renders selected tags as badge chips', () => {
    render(<TagSelect selected={['t1']} onChange={vi.fn()} tags={tags} />);
    expect(screen.getByText(/frontend/)).toBeInTheDocument();
  });

  it('clicking a tag in the dropdown calls onChange with added id', () => {
    const onChange = vi.fn();
    render(<TagSelect selected={[]} onChange={onChange} tags={tags} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tag' }));
    fireEvent.click(screen.getByText('frontend'));
    expect(onChange).toHaveBeenCalledWith(['t1']);
  });

  it('clicking a selected tag in the dropdown removes it', () => {
    const onChange = vi.fn();
    render(<TagSelect selected={['t1']} onChange={onChange} tags={tags} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tag' }));
    fireEvent.click(screen.getByText('frontend'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('clicking a selected badge chip removes the tag', () => {
    const onChange = vi.fn();
    render(<TagSelect selected={['t1']} onChange={onChange} tags={tags} />);
    fireEvent.click(screen.getByTitle('Remove frontend'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
