import { TextEncoder, TextDecoder } from 'util';
// import { BroadcastChannel } from 'broadcast-channel'; // Removed import

global.TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Remove conditional polyfill
// if (typeof global.BroadcastChannel === 'undefined') {
//  (global as any).BroadcastChannel = BroadcastChannel;
// }

// Add a simple global mock for BroadcastChannel before tests run
if (typeof global.BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(name: string) {}
    postMessage(message: any) {}
    close() {}
    onmessage = null;
    onmessageerror = null;
    // Add other methods/properties if needed by MSW, but keep it minimal
  } as any;
}

// Add any global setup for Jest tests here
import '@testing-library/jest-dom';

import 'cross-fetch/polyfill';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
    }
  }
} 