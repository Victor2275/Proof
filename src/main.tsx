import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

/*
 * The cookbook is read from the device, so a query must never wait for a
 * network it doesn't use: `networkMode: 'always'` stops TanStack pausing every
 * query while the browser reports itself offline. Each hook in lib/queries.ts
 * sets its own staleness and retry, local and remote differently.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
