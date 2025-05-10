import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VibeFC - Financial Forecasting Platform',
  description: 'Create and maintain financial forecasts with ease',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 