// src/routes/App.js
import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/homepage";
import AuthPage from "../pages/authpage";
import Layout from "../components/Layout";
import Dashboard from "../pages/dashboard";
import Profile from "../pages/profile";
import UploadPost from "../pages/upload";
import MessagesPage from "../pages/messagespage";
import ProductPage from "../pages/productpage";
import TradePage from "../pages/tradepage";

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Main App Layout */}
      <Route path="/" element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/upload" element={<UploadPost />} />
        <Route path="/messagespage" element={<MessagesPage />} />
        <Route path="/productpage" element={<ProductPage />} />
        <Route path="/tradepage" element={<TradePage />} />
        {/*<Route path="/tradepage/:tradeId" element={<TradePage />} />*/}
      </Route>
    </Routes>
  );
}

export default App;