import { render, screen } from '@testing-library/react';
import App from './App';

test('renders delivery service home title', () => {
  render(<App />);
  const headingElement = screen.getByText(/Get Your Favorite Food Delivered/i);
  expect(headingElement).toBeInTheDocument();
});
