import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminPage } from '@client/pages/Admin/AdminPage';
import { ParticipantPage } from '@client/pages/Participant/ParticipantPage';
import type { ReactElement } from 'react';

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/participant" replace />} />
        <Route path="/participant" element={<ParticipantPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
