import React from 'react';
import Layout from './components/Layout';
import { useICP } from './hooks/useICP';

// 创建上下文
export const AppContext = React.createContext(null);

function App() {
  const icpState = useICP();

  return (
    <AppContext.Provider value={icpState}>
      <Layout />
    </AppContext.Provider>
  );
}

export default App;