import { Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Profile from './pages/profile';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Layout from './Layout';
console.log("AuthPage:", AuthPage);
console.log("Dashboard:", Dashboard);
console.log("Raw Layout import:", require('./Layout'));
console.log("Layout:", Layout);
console.log("Profile:", Profile);
console.log("Messages:", Messages);
function App() {
  return (
    <Routes>
      {/* Auth page without navbar */}
      <Route path="/" element={<AuthPage />} />

      {/* All other pages wrapped with navbar */}
      <Route element={<Layout />}>
        
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/chat/:user_id" element={<Chat />} />
      </Route>
    </Routes>
  );
}

export default App;