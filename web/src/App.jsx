import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import { authService } from './services/api';
import PublicView from './components/PublicView';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" /> : <Login onLogin={() => setIsAuthenticated(true)} />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/" /> : <Register onRegister={() => setIsAuthenticated(true)} />} 
        />
        <Route 
          path="/" 
          element={isAuthenticated ? <Dashboard onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/login" />} 
        />
        // Route for PublicView
        <Route path="/public/:token" element={<PublicView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
