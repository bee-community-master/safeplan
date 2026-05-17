import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RunwaySimulator } from '@/components/RunwaySimulator';

describe('RunwaySimulator client privacy', () => {
  it('renders results without posting financial inputs', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<RunwaySimulator />);
    expect(screen.getByTestId('runway-stopped')).toHaveTextContent('0.5개월');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
