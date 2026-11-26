import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createQueryClient } from '@/app/api';
import { QuestionnairePage } from '@/app/QuestionnairePage';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <QuestionnairePage jobId="job-short" />
    </QueryClientProvider>
  </StrictMode>,
);
