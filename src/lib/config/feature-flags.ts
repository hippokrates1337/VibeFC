// NEXT_PUBLIC_* values are inlined at build time, so this works in server and client code.
export const isDebugToolsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === 'true';
