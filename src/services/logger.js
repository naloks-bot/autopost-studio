/**
 * Lightweight development-only logger.
 * Only logs when import.meta.env.DEV is true.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  info: (message, ...args) => {
    if (isDev) console.log(`[AutoPost INFO] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    if (isDev) console.warn(`[AutoPost WARN] ${message}`, ...args);
  },
  error: (message, ...args) => {
    if (isDev) console.error(`[AutoPost ERROR] ${message}`, ...args);
  },
  debug: (message, ...args) => {
    if (isDev) console.debug(`[AutoPost DEBUG] ${message}`, ...args);
  }
};
