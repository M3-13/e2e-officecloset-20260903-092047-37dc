import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Wardrobe from "./pages/Wardrobe.jsx";
import OutfitCreator from "./pages/OutfitCreator.jsx";
import Outfits from "./pages/Outfits.jsx";
import Account from "./pages/Account.jsx";
import Privacy from "./pages/Privacy.jsx";
import Imprint from "./pages/Imprint.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="page-loading">Wird geladen&hellip;</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route
            path="wardrobe"
            element={
              <ProtectedRoute>
                <Wardrobe />
              </ProtectedRoute>
            }
          />
          <Route
            path="outfit-creator"
            element={
              <ProtectedRoute>
                <OutfitCreator />
              </ProtectedRoute>
            }
          />
          <Route
            path="outfits"
            element={
              <ProtectedRoute>
                <Outfits />
              </ProtectedRoute>
            }
          />
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route path="privacy" element={<Privacy />} />
          <Route path="imprint" element={<Imprint />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
