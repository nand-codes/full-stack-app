import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scores from './pages/Scores';
import SubscriptionPage from './pages/SubscriptionPage';
import CharitiesPage from './pages/CharitiesPage';
import DrawPage from './pages/DrawPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserEditPage from './pages/AdminUserEditPage';
import AdminCharityEditPage from './pages/AdminCharityEditPage';
import AdminDrawActionPage from './pages/AdminDrawActionPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<Navigate to="/login" replace />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/scores"       element={<Scores />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/charities"    element={<CharitiesPage />} />
        <Route path="/draw"         element={<DrawPage />} />
        <Route path="/admin"        element={<AdminDashboard />} />
        <Route path="/admin/users/:id" element={<AdminUserEditPage />} />
        <Route path="/admin/charities/create" element={<AdminCharityEditPage />} />
        <Route path="/admin/charities/:slug" element={<AdminCharityEditPage />} />
        <Route path="/admin/draws/create" element={<AdminDrawActionPage />} />
        <Route path="/admin/draws/:id" element={<AdminDrawActionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

