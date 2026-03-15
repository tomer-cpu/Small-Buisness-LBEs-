import { createClient } from '@base44/sdk';

export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
});

// Entity exports
export const { Product, Forecast, AppSettings, NotebookSource } = base44.entities;
