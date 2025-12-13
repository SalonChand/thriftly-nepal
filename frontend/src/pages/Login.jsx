
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = (e) => {
        e.preventDefault();
        axios.post('https://thriftly-nepal.onrender.com/login', { email, password }, { withCredentials: true })
            .then(res => {
                if(res.data.Status === "Success") {
                    login(res.data); // Save user to Context
                    navigate('/');   // Go to Home
                } else {
                    setError(res.data.Error);
                }
            })
            .catch(err => console.log(err));
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-stone-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
                        <LogIn className="text-white" size={32} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-stone-900">Welcome Back</h2>
                    <p className="text-stone-400 mt-2">Login to continue thrift shopping</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input 
                            type="email" 
                            placeholder="Email Address" 
                            className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-orange-500 transition"
                            onChange={e => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <div>
                        <input 
                            type="password" 
                            placeholder="Password" 
                            className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-orange-500 transition"
                            onChange={e => setPassword(e.target.value)} 
                            required 
                        />
                    </div>

                    {/* 🟢 HERE IS THE NEW LINK 🟢 */}
                    <div className="text-right">
                        <Link to="/forgot-password" class="text-xs font-bold text-stone-400 hover:text-stone-900 transition">
                            Forgot Password?
                        </Link>
                    </div>

                    {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded">{error}</p>}

                    <button className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg hover:shadow-orange-500/20">
                        Login
                    </button>
                </form>

                <p className="text-center mt-8 text-stone-500 text-sm">
                    Don't have an account? <Link to="/register" className="font-bold text-stone-900 hover:underline">Register</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;