import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AdminLogin from './components/AdminLogin';
import InstitutionLogin from './components/InstitutionLogin';
import AdminLayout from './components/AdminLayout';
import InstitutionLayout from './components/InstitutionLayout';
import InstitutionDataSubmission from './components/InstitutionDataSubmission';
import InstitutionDashboard from './components/InstitutionDashboard';
import CreditRecords from './components/CreditRecords';

import { useICP } from './hooks/useICP';
import UploadHistory from './components/UploadHistory';

// 创建上下文
export const AppContext = React.createContext(null);

function App() {
  const icpState = useICP();

  return (
    <AppContext.Provider value={icpState}>
  <Routes>
  <Route path="/admin/*" element={<AdminLayout />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/credit" element={<CreditRecords />} />
      <Route path="/" element={<Navigate to="/admin/login" />} />
      <Route path="/institution/*" element={<InstitutionLayout />} />
      <Route path="/institution/login" element={<InstitutionLogin />} />
      <Route path="/institution/submit" element={<InstitutionDataSubmission />} />
      <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
      <Route path="/institution/history" element={<UploadHistory />} />

    </Routes>
    </AppContext.Provider>
  );
}

export default App;