/**
 * This file runs before Jest loads any tests or modules.
 * It sets up global objects needed by dependencies.
 */

// Use Node.js built-in modules for encoders
const { TextEncoder, TextDecoder } = require('util');
// Use crypto polyfill for node environments
const { Crypto } = require('@peculiar/webcrypto');

// Add these to the Node.js global object directly, before any imports happen
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = new Crypto();

// Try to create a minimal TransformStream implementation
// This is a fallback if the proper polyfills aren't available
if (typeof global.TransformStream === 'undefined') {
  console.log('Implementing basic TransformStream polyfill');
  
  // A very basic TransformStream polyfill - just enough to prevent errors
  global.TransformStream = class TransformStream {
    constructor(transformer) {
      this.transformer = transformer || {};
      this.readable = {
        getReader() { return { read() { return Promise.resolve({ done: true, value: undefined }) } } }
      };
      this.writable = {
        getWriter() { return { write() { return Promise.resolve() }, close() { return Promise.resolve() } } }
      };
    }
  };

  // Implement ReadableStream and WritableStream if needed
  if (typeof global.ReadableStream === 'undefined') {
    global.ReadableStream = class ReadableStream {
      constructor() {
        this.locked = false;
      }
      getReader() { return { read() { return Promise.resolve({ done: true, value: undefined }) } } }
    };
  }

  if (typeof global.WritableStream === 'undefined') {
    global.WritableStream = class WritableStream {
      constructor() {
        this.locked = false;
      }
      getWriter() { return { write() { return Promise.resolve() }, close() { return Promise.resolve() } } }
    };
  }
}

// Try to load stream/web as a backup
try {
  // Attempt to use Node.js built-in web streams if available
  const webStreams = require('stream/web');
  if (webStreams && webStreams.TransformStream) {
    console.log('Using stream/web for TransformStream');
    global.TransformStream = webStreams.TransformStream;
    global.ReadableStream = webStreams.ReadableStream;
    global.WritableStream = webStreams.WritableStream;
  }
} catch (e) {
  // Already handled with our basic polyfill above
}

// Additional fallbacks for other web APIs that might be needed
if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'Error';
      this.code = 0;
    }
  };
}

module.exports = async () => {
  // This function will be run once before tests are loaded
  console.log('Global setup complete with minimal polyfills');
}; 