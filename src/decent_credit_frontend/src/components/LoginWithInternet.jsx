import React, { useState, useRef } from 'react';
import { AuthClient } from '@dfinity/auth-client';

const AdminLogin = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef(null);

  const handleIILogin = async () => {
    try {
      setLoading(true);
      const authClient = await AuthClient.create();
      
      const success = await authClient.login({
        identityProvider: `http://127.0.0.1:4943/?canisterId=bkyz2-fmaaa-aaaaa-qaaaq-cai`,
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          
          try {
            const response = await window.ic.verifyAdminIdentity(principal);
            if (response.success) {
              localStorage.setItem('adminIdentity', principal.toString());
              window.location.href = '/admin/dashboard';
            } else {
              setError('Not authorized as admin');
              dialogRef.current?.showModal();
            }
          } catch (err) {
            setError('Failed to verify admin status');
            dialogRef.current?.showModal();
          }
        },
      });

      if (!success) {
        setError('Login failed');
        dialogRef.current?.showModal();
      }
    } catch (err) {
      setError('Login failed: ' + err.message);
      dialogRef.current?.showModal();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Admin Login</h1>
        
        <button
          onClick={handleIILogin}
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login with Internet Identity'}
        </button>

        {/* Error Dialog */}
        <dialog
          ref={dialogRef}
          className="p-6 rounded-lg shadow-xl backdrop:bg-black/30"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-red-600">
              Error
            </h3>
            <p className="text-gray-500">
              {error}
            </p>
            <button
              className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </button>
          </div>
        </dialog>
      </div>
    </div>
  );
};

export default AdminLogin;