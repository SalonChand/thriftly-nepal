import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = Email, 2 = Verify OTP & Reset
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const handleSendCode = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/forgot-password', { email }).then(res => {
            if(res.data.Status === "Success") {
                alert("Reset code sent to your email!");
                setStep(2);
            } else alert(res.data.Error);
        });
    };

    const handleReset = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/reset-password', { email, otp, newPassword }).then(res => {
            if(res.data.Status === "Success") {
                alert("Password Updated! Please Login.");
                navigate('/login');
            } else alert(res.data.Error);
        });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
                <h2 className="text-2xl font-serif font-bold mb-2">Reset Password</h2>
                <p className="text-stone-500 mb-6 text-sm">Don't worry, it happens to the best of us.</p>

                {step === 1 ? (
                    <form onSubmit={handleSendCode} className="space-y-4">
                        <input type="email" placeholder="Enter your email" className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-orange-500" onChange={e => setEmail(e.target.value)} required />
                        <button className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition">Send Code</button>
                    </form>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        <input type="text" placeholder="Enter 4-digit Code" className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200 text-center font-bold tracking-widest" onChange={e => setOtp(e.target.value)} required />
                        <input type="password" placeholder="New Password" className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200" onChange={e => setNewPassword(e.target.value)} required />
                        <button className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition">Update Password</button>
                    </form>
                )}
            </div>
        </div>
    );
};
export default ForgotPassword;