// A simple logger utility that only logs in development environment

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(message, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (isDev) {
      console.error(message, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (isDev) {
      console.warn(message, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      console.info(message, ...args);
    }
  }
}; 