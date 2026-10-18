import { notFound } from 'next/navigation';
import { isDebugToolsEnabled } from '@/lib/config/feature-flags';

// Debug tooling is hidden unless NEXT_PUBLIC_ENABLE_DEBUG_TOOLS=true.
export default function DebugCalcLayout({ children }: { children: React.ReactNode }) {
  if (!isDebugToolsEnabled()) {
    notFound();
  }
  return <>{children}</>;
}
