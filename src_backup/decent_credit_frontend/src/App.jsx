import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AdminLogin from './components/AdminLogin';
import InstitutionLogin from './components/InstitutionLogin';
import Layout from './components/Layout';
import Layout2 from './components/Layout2';
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
      <Route path="/admin/*" element={<Layout />} />
      <Route path="/institution/*" element={<Layout2 />} />
      <Route path="/" element={<Navigate to="/admin/login" />} />
      <Route path="/institution/submit" element={<InstitutionDataSubmission />} />
      <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
    </Routes>
    </AppContext.Provider>
  );
}

export default App;