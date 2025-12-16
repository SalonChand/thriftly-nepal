import React, { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; 
import { getImageUrl } from './utils';

// 👇 1. IMPORT YOUR LOGO
import logoImg from './logo.png';

// Import Pages
import Home from './pages/Home';
import Sell from './pages/Sell';
import Register from './pages/Register';
import Login from './pages/Login';
import ProductDetails from './pages/ProductDetails';
import Profile from './pages/Profile';
import Admin from './pages/Admin'; 
import PaymentSuccess from './pages/PaymentSuccess';
import ForgotPassword from './pages/ForgotPassword';
import About from './pages/About';
import Contact from './pages/Contact';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { LogOut, User, Menu, X } from 'lucide-react'; // Removed ShoppingBag

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-stone-100 transition-all duration-300">
      <div className="container mx-auto px-6 h-20 flex justify-between items-center">
        
        {/* LOGO SECTION */}
        <Link to="/" className="flex items-center gap-2 group">
            {/* 👇 2. IMAGE LOGO IS HERE */}
            <img 
                src={logoImg} 
                alt="ThriftLy" 
                className="h-10 w-auto object-contain" 
            />
            <span className="text-3xl font-serif font-bold text-stone-900 tracking-tighter">
              Thrift<span className="text-orange-600">Ly.</span>
            </span>
        </Link>

        {/* CENTER MENU */}
        <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-stone-500 hover:text-stone-900 font-medium transition">Shop</Link>
            <Link to="/sell" className="text-stone-500 hover:text-stone-900 font-medium transition">Sell Items</Link>
            <Link to="/about" className="text-stone-500 hover:text-stone-900 font-medium transition">About</Link>
            <Link to="/contact" className="text-stone-500 hover:text-stone-900 font-medium transition">Contact</Link>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="hidden md:flex items-center gap-4">
            {user ? (
                <>
                    {user.role === 'admin' && (
                        <Link to="/admin" className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700">ADMIN</Link>
                    )}
                    <Link to="/profile" className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden border border-orange-200 hover:bg-orange-200 transition">
                        {user.profile_pic ? (
                        <img src={getImageUrl(user.profile_pic)} className="w-full h-full object-cover" />
                        ) : (
                        <span className="text-orange-600 font-bold">{user.username ? user.username[0].toUpperCase() : <User size={18}/>}</span>
                        )}
                    </Link>
                    <button onClick={logout} className="p-2 text-stone-400 hover:text-red-500 transition"><LogOut size={20}/></button>
                </>
            ) : (
                <Link to="/login" className="bg-stone-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-stone-800 transition">Login</Link>
            )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button className="md:hidden text-stone-900" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-stone-100 p-6 flex flex-col gap-4 shadow-xl">
            <Link to="/" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>Shop</Link>
            <Link to="/sell" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>Sell Items</Link>
            <Link to="/about" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>About</Link>
            <Link to="/contact" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>Contact</Link>
            <div className="border-t border-stone-100 my-2"></div>
            {user ? (
                <>
                    <Link to="/profile" className="text-lg font-bold text-orange-600" onClick={() => setIsOpen(false)}>My Profile</Link>
                    {user.role === 'admin' && <Link to="/admin" className="text-lg font-bold text-red-600" onClick={() => setIsOpen(false)}>Admin Dashboard</Link>}
                    <button onClick={() => { logout(); setIsOpen(false); }} className="text-lg font-bold text-stone-400 text-left">Logout</button>
                </>
            ) : (
                <>
                    <Link to="/login" className="text-lg font-bold text-stone-700" onClick={() => setIsOpen(false)}>Login</Link>
                    <Link to="/register" className="text-lg font-bold text-orange-600" onClick={() => setIsOpen(false)}>Register</Link>
                </>
            )}
        </div>
      )}
    </nav>
  );
};

const Footer = () => (
    <footer className="bg-stone-900 text-stone-400 py-12 mt-auto">
        <div className="container mx-auto px-6 text-center text-xs">
            © 2025 ThriftLy Nepal. All rights reserved.
        </div>
    </footer>
);

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" />;
};

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