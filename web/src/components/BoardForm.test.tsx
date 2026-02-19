import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BoardForm from './BoardForm';

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

function fillRequiredFields(name = 'My Board', url = 'https://example.com/jobs') {
  // Name
  fireEvent.change(screen.getByDisplayValue(''), { target: { value: name } });
  // URL — find by type=url
  const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement;
  if (urlInput) fireEvent.change(urlInput, { target: { value: url } });

  // Fill required selector fields via placeholder
  const allInputs = document.querySelectorAll('input.input');
  allInputs.forEach((inp) => {
    const el = inp as HTMLInputElement;
    if (el.placeholder.includes('.job-listing')) fireEvent.change(el, { target: { value: '.job' } });
    if (el.placeholder.includes('h2.job-title')) fireEvent.change(el, { target: { value: '.title' } });
    if (el.placeholder.includes('a.apply-link')) fireEvent.change(el, { target: { value: 'a' } });
  });
}

describe('BoardForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders all selector fields', () => {
    render(<BoardForm {...defaultProps} />);
    expect(screen.getByText('Job Card Container')).toBeInTheDocument();
    expect(screen.getByText('Job Title')).toBeInTheDocument();
    expect(screen.getByText(/job link/i)).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Posted Date')).toBeInTheDocument();
  });

  it('shows error when required selectors are missing on submit', async () => {
    render(<BoardForm {...defaultProps} />);
    // Submit the form directly to bypass browser native HTML5 validation
    const form = document.querySelector('form.board-form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Job Card, Title, and Link selectors are required')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with board data when all required fields are filled', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BoardForm {...defaultProps} onSubmit={onSubmit} />);

    // Fill name
    const nameInput = document.querySelector('input.input:not([type])') as HTMLInputElement;
    if (nameInput) fireEvent.change(nameInput, { target: { value: 'My Board' } });

    // Fill URL
    const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement;
    if (urlInput) fireEvent.change(urlInput, { target: { value: 'https://example.com/jobs' } });

    // Fill required selector fields
    const allInputs = document.querySelectorAll('input.input');
    allInputs.forEach((inp) => {
      const el = inp as HTMLInputElement;
      if (el.placeholder.includes('.job-listing')) fireEvent.change(el, { target: { value: '.job' } });
      if (el.placeholder.includes('h2.job-title')) fireEvent.change(el, { target: { value: '.title' } });
      if (el.placeholder.includes('a.apply-link')) fireEvent.change(el, { target: { value: 'a' } });
    });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('"Cancel" button calls onCancel', () => {
    render(<BoardForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
