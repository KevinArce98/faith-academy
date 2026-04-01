/**
 * Feature flags — must stay in sync with academy-app-web/src/lib/config/studio.config.ts
 * Enable/disable features here and in the frontend config together.
 */
export const features = {
  lms: false,
  attendanceScanner: false,
  reports: false,
} as const;
