import React, { useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { CheckCircle, Rocket } from 'lucide-react';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const { user } = useContext(AuthContext);

    const productId = searchParams.get("pid");
    const sellerId = searchParams.get("seller_id");
    const type = searchParams.get("type"); // 🆕 Check payment type

    useEffect(() => {
        if (productId && user) {
            
            // 🚀 CASE 1: BOOST PAYMENT
            if (type === 'boost') {
                axios.post(`http://localhost:5000/boost/${productId}`, {}, { withCredentials: true })
                    .then(res => {
                        if (res.data.Status === "Success") {
                            confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
                        }
                    });
            } 
            
            // 🛍️ CASE 2: REGULAR PURCHASE
            else {
                axios.post(`http://localhost:5000/buy/${productId}`, {
                    buyer_id: user.id,
                    seller_id: sellerId
                }, { withCredentials: true })
                .then(res => {
                    if (res.data.Status === "Success") {
                        confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
                    }
                });
            }
        }
    }, [productId, user, type]);

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-sans">
            <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${type === 'boost' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                    {type === 'boost' ? <Rocket size={40}/> : <CheckCircle size={40} />}
                </div>
                
                <h1 className="text-3xl font-serif font-bold text-stone-900 mb-3">
                    {type === 'boost' ? "Boost Activated!" : "Payment Successful!"}
                </h1>
                
                <p className="text-stone-500 mb-8">
                    {type === 'boost' 
                        ? "Your item is now Featured on the Home Page for 3 days." 
                        : "Thank you for your purchase. The seller has been notified."}
                </p>
                
                <Link to={type === 'boost' ? "/profile" : "/"} className="block w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition">
                    {type === 'boost' ? "Back to Profile" : "Continue Shopping"}
                </Link>
            </div>
        </div>
    );
};

export default PaymentSuccess;