import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AdminLogin from './components/AdminLogin';
import InstitutionLogin from './components/InstitutionLogin';
import AdminLayout from './components/AdminLayout';
import InstitutionAdminLayout from './components/InstitutionAdminLayout';
import InstitutionDataSubmission from './components/InstitutionDataSubmission';
import InstitutionDashboard from './components/InstitutionDashboard';

import { useICP } from './hooks/useICP';

// 创建上下文
export const AppContext = React.createContext(null);

function App() {
  const icpState = useICP();

  return (
    <AppContext.Provider value={icpState}>
  <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/institution/login" element={<InstitutionLogin />} />
      <Route path="/admin/*" element={<AdminLayout />} />
      <Route path="/institution/*" element={<InstitutionAdminLayout />} />
      <Route path="/" element={<Navigate to="/admin/login" />} />
      <Route path="/institution/submit" element={<InstitutionDataSubmission />} />
      <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
    </Routes>
    </AppContext.Provider>
  );
}

export default App;