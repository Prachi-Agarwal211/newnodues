import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '@/components/ui/Input';

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
}));

describe('Input Component', () => {
  it('renders with label', () => {
    render(<Input label="Full Name" name="full_name" />);
    expect(screen.getByText('Full Name')).toBeInTheDocument();
  });

  it('shows required asterisk', () => {
    render(<Input label="Email" name="email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders input with placeholder', () => {
    render(<Input label="Name" name="name" placeholder="Enter your name" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input label="Email" name="email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Name" name="name" disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('renders as select when type is select', () => {
    render(
      <Input
        label="School"
        name="school"
        type="select"
        options={[
          { value: '1', label: 'School A' },
          { value: '2', label: 'School B' },
        ]}
      />
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('School A')).toBeInTheDocument();
    expect(screen.getByText('School B')).toBeInTheDocument();
  });

  it('handles text input change', async () => {
    const handleChange = jest.fn();
    render(<Input label="Name" name="name" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'John');
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders password toggle button for password type', () => {
    render(<Input label="Password" name="password" type="password" />);
    const toggleBtn = screen.getByRole('button');
    expect(toggleBtn).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const { container } = render(<Input label="Password" name="password" type="password" />);
    const toggleBtn = screen.getByRole('button');

    // The input element (password type) - floating labels don't have htmlFor,
    // so getByLabelText won't work. Use getByRole instead.
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(toggleBtn);
    // After toggle, type becomes "text"
    expect(input).toHaveAttribute('type', 'text');
  });
});
