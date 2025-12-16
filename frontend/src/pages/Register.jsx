import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';

const Register = () => {
    const [step, setStep] = useState(1);
    const [values, setValues] = useState({
        username: '',
        email: '',
        phone: '',
        password: ''
    });
    const [otp, setOtp] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const handleRegister = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/register', values)
            .then(res => {
                if(res.data.Status === "Success") {
                    setStep(2);
                    // 1. THIS IS THE FIX YOU ASKED FOR:
                    alert(`OTP has been sent to email: ${values.email}`); 
                } else {
                    alert("Error: " + res.data.Error);
                }
            })
            .catch(err => console.log(err));
    };

    const handleVerify = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/verify', { email: values.email, otp: otp })
            .then(res => {
                if(res.data.Status === "Success") {
                    alert("Account Verified! Please Login.");
                    navigate('/login');
                } else {
                    alert("Invalid Code.");
                }
            })
            .catch(err => console.log(err));
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7] font-sans p-4">
            <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-stone-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">{step === 1 ? "Create Account" : "Verify Email"}</h1>
                    <p className="text-stone-500 text-sm">{step === 1 ? "Join ThriftLy today." : `Enter code sent to ${values.email}`}</p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="relative"><User className="absolute left-4 top-3.5 text-stone-400" size={20}/><input type="text" name="username" placeholder="Username" required className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50" onChange={handleChange} /></div>
                        <div className="relative"><Mail className="absolute left-4 top-3.5 text-stone-400" size={20}/><input type="email" name="email" placeholder="Email" required className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50" onChange={handleChange} /></div>
                        <div className="relative"><Phone className="absolute left-4 top-3.5 text-stone-400" size={20}/><input type="text" name="phone" placeholder="Phone" required className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50" onChange={handleChange} /></div>
                        <div className="relative"><Lock className="absolute left-4 top-3.5 text-stone-400" size={20}/><input type="password" name="password" placeholder="Password" required className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50" onChange={handleChange} /></div>
                        <button className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition">Send Code</button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-6">
                        <input type="text" placeholder="0000" maxLength="4" className="w-full text-center text-3xl tracking-[1rem] py-4 rounded-xl border-2 border-stone-200 font-mono" onChange={(e) => setOtp(e.target.value)} />
                        <button className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2"><CheckCircle size={20}/> Verify & Create</button>
                        <button type="button" onClick={() => setStep(1)} className="w-full text-stone-500 text-sm">Go Back</button>
                    </form>
                )}
                <div className="text-center mt-8 text-sm text-stone-500">Already have an account? <Link to="/login" className="font-bold text-stone-900">Log in</Link></div>
            </div>
        </div>
    );
};
export default Register;