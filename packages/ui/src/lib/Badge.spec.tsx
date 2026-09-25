import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge label="Theory Network" />);
    expect(screen.getByText('This text is not rendered')).toBeTruthy();
  });

  it('renders the count only when one is given', () => {
    const { rerender } = render(<Badge label="Projects" />);
    expect(screen.queryByText('2')).toBeNull();

    rerender(<Badge label="Projects" count={2} />);
    expect(screen.getByText('2')).toBeTruthy();
  });
});
