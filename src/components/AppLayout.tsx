import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Titlebar from './Titlebar';
import Sidebar from './Sidebar';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('aclass_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col bg-bg text-text">
      <Titlebar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
