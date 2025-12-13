import React, { useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { CheckCircle } from 'lucide-react';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const { user } = useContext(AuthContext);

    // Get parameters from the URL that we passed to eSewa earlier
    const productId = searchParams.get("pid");
    const sellerId = searchParams.get("seller_id");

    useEffect(() => {
        if (productId && user) {
            // 1. Mark item as sold in Database
            axios.post(`http://localhost:5000/buy/${productId}`, {
                buyer_id: user.id,
                seller_id: sellerId
            }, { withCredentials: true })
            .then(res => {
                if (res.data.Status === "Success") {
                    console.log("Order Recorded!");
                    // 2. Fire Confetti
                    confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
                }
            })
            .catch(err => console.log(err));
        }
    }, [productId, user]);

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-sans">
            <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h1 className="text-3xl font-serif font-bold text-stone-900 mb-3">Payment Successful!</h1>
                <p className="text-stone-500 mb-8">Thank you for your purchase via eSewa. The seller has been notified.</p>
                <Link to="/" className="block w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition">
                    Continue Shopping
                </Link>
            </div>
        </div>
    );
};

export default PaymentSuccess;