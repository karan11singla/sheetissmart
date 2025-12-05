import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SheetPage from './pages/SheetPage';
import AccountPage from './pages/AccountPage';
import FavoritesPage from './pages/FavoritesPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SharedSheetPage from './pages/SharedSheetPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/shared/:token" element={<SharedSheetPage />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/sheet/:id" element={<SheetPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
