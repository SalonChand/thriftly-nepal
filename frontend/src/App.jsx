import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { getImageUrl } from './utils';
import logoImg from './logo.png';
import axios from 'axios';

// Pages
import Home from './pages/Home'; import Sell from './pages/Sell'; import Register from './pages/Register'; import Login from './pages/Login'; import ProductDetails from './pages/ProductDetails'; import Profile from './pages/Profile'; import Admin from './pages/Admin'; import PaymentSuccess from './pages/PaymentSuccess'; import ForgotPassword from './pages/ForgotPassword'; import About from './pages/About'; import Contact from './pages/Contact';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { LogOut, User, Menu, X, Bell, ShoppingBag, Clock } from 'lucide-react';
import io from 'socket.io-client';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if(user) {
        axios.get('http://localhost:5000/notifications', { withCredentials: true })
            .then(res => { if(Array.isArray(res.data)) setNotifications(res.data); })
            .catch(err => console.log(err));

        const socket = io("http://localhost:5000");
        socket.on(`notification_${user.id}`, (data) => {
            setNotifications(prev => [data, ...prev]);
            toast(data.message, { icon: '🔔' });
        });
        return () => socket.disconnect();
    }
  }, [user]);

  const handleShowNotifications = () => {
      if (!showNotif) {
          const readNotifs = notifications.map(n => ({ ...n, is_read: 1 }));
          setNotifications(readNotifs);
          axios.put('http://localhost:5000/notifications/read', {}, { withCredentials: true })
              .catch(err => console.log("Error marking read"));
      }
      setShowNotif(!showNotif);
  };

  const handleNotifClick = (n) => {
      setShowNotif(false);
      if (n.type === 'message') navigate('/profile', { state: { tab: 'messages' } });
      if (n.type === 'offer') navigate('/profile', { state: { tab: 'offers' } });
      if (n.type === 'sale') navigate('/profile', { state: { tab: 'sales' } });
      if (n.type === 'follow') navigate('/profile');
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-stone-100 transition-all duration-300">
      <div className="container mx-auto px-6 h-20 flex justify-between items-center">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 group">
            <img src={logoImg} alt="ThriftLy" className="h-10 w-auto object-contain" />
            <span className="text-3xl font-serif font-bold text-stone-900 tracking-tighter">
              Thrift<span className="text-orange-600">Ly.</span>
            </span>
        </Link>

        {/* MENU (Restored Contact) */}
        <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-stone-500 hover:text-stone-900 font-medium transition">Shop</Link>
            <Link to="/sell" className="text-stone-500 hover:text-stone-900 font-medium transition">Sell Items</Link>
            <Link to="/about" className="text-stone-500 hover:text-stone-900 font-medium transition">About</Link>
            {/* 👇 ADDED THIS BACK */}
            <Link to="/contact" className="text-stone-500 hover:text-stone-900 font-medium transition">Contact</Link>
        </div>

        {/* ACTIONS */}
        <div className="hidden md:flex items-center gap-4">
            {user ? (
                <>
                    {user.role === 'admin' && <Link to="/admin" className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700">ADMIN</Link>}
                    
                    {/* NOTIFICATIONS */}
                    <div className="relative">
                        <button onClick={handleShowNotifications} className="p-2 text-stone-500 hover:text-stone-900 relative">
                            <Bell size={20}/>
                            {notifications.some(n => !n.is_read) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
                        </button>
                        {showNotif && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden animate-fade-in z-50">
                                <div className="p-3 font-bold border-b text-sm flex justify-between items-center bg-stone-50">
                                    <span>Notifications</span>
                                    <button onClick={() => setShowNotif(false)}><X size={14}/></button>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? <p className="p-4 text-xs text-stone-400 text-center">No new notifications</p> : notifications.map((n, i) => (
                                        <button key={i} onClick={() => handleNotifClick(n)} className={`w-full text-left p-3 text-xs border-b hover:bg-stone-50 flex flex-col gap-1 transition bg-white`}>
                                            <span className="font-medium text-stone-800">{n.message}</span>
                                            <span className="text-[10px] text-stone-400 flex items-center gap-1">
                                                <Clock size={10}/> {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Link to="/profile" className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden border border-orange-200 hover:bg-orange-200 transition">
                        {user.profile_pic ? <img src={getImageUrl(user.profile_pic)} className="w-full h-full object-cover" /> : <span className="text-orange-600 font-bold">{user.username ? user.username[0].toUpperCase() : <User size={18}/>}</span>}
                    </Link>
                    <button onClick={logout} className="p-2 text-stone-400 hover:text-red-500 transition"><LogOut size={20}/></button>
                </>
            ) : (<Link to="/login" className="bg-stone-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-stone-800 transition">Login</Link>)}
        </div>
        <button className="md:hidden text-stone-900" onClick={() => setIsOpen(!isOpen)}>{isOpen ? <X size={28} /> : <Menu size={28} />}</button>
      </div>
      {/* Mobile Menu */}
      {isOpen && (<div className="md:hidden bg-white border-t border-stone-100 p-6 flex flex-col gap-4 shadow-xl"><Link to="/" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>Shop</Link><Link to="/sell" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>Sell Items</Link><Link to="/about" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>About</Link><Link to="/contact" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>Contact</Link><div className="border-t border-stone-100 my-2"></div>{user ? (<><Link to="/profile" className="text-lg font-bold text-orange-600" onClick={() => setIsOpen(false)}>My Profile</Link><button onClick={() => { logout(); setIsOpen(false); }} className="text-lg font-bold text-stone-400 text-left">Logout</button></>) : (<><Link to="/login" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>Login</Link><Link to="/register" className="text-lg font-bold text-orange-600" onClick={() => setIsOpen(false)}>Register</Link></>)}</div>)}
    </nav>
  );
};

const Footer = () => (<footer className="bg-stone-900 text-stone-400 py-12 mt-auto"><div className="container mx-auto px-6 text-center text-xs">© 2025 ThriftLy Nepal. All rights reserved.</div></footer>);
const ProtectedRoute = ({ children }) => { const { user } = useContext(AuthContext); return user ? children : <Navigate to="/login" />; };

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col font-sans bg-white">
          <Navbar />
          <Toaster position="top-center" reverseOrder={false} />
          <div className="flex-grow pt-20"> 
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;