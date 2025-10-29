// src/routes/App.js
import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import AuthPage from "../pages/AuthPage";
import Layout from "../components/Layout";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import TradePage from "../pages/TradePage";
import MessagesPage from "../pages/MessagesPage";
import ProductPage from "../pages/ProductPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/products" element={<ProductPage />} />
      </Route>
    </Routes>
  );
}

export default App;