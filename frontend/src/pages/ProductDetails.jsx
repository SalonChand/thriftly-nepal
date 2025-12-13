import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ShoppingBag, ShieldCheck, MessageCircle, X, Star, Tag, Phone, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';

const ProductDetails = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // Data States
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [sellerRating, setSellerRating] = useState({ avg: 0, count: 0 });
    
    // UI States
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [activeImage, setActiveImage] = useState(""); // 🆕 Holds the currently selected image

    useEffect(() => {
        axios.get(`http://localhost:5000/products/${id}`).then(res => {
            setProduct(res.data);
            setActiveImage(res.data.image_url); // 🆕 Set initial main image
            
            // Fetch extras
            fetchRelated(res.data.category, res.data.id);
            fetchSellerRating(res.data.seller_id);
        }).catch(err => console.log(err));
        
        window.scrollTo(0, 0);
    }, [id]);

    const fetchRelated = (category, currentId) => {
        axios.get('http://localhost:5000/all-products').then(res => {
            if(Array.isArray(res.data)) {
                setRelatedProducts(res.data.filter(item => item.category === category && item.id !== currentId).slice(0, 4));
            }
        });
    };

    const fetchSellerRating = (sellerId) => {
        axios.get(`http://localhost:5000/reviews/${sellerId}`).then(res => setSellerRating(res.data));
    };

    // --- ESEWA LOGIC ---
    const handleEsewaPayment = (e) => {
        e.preventDefault();
        const transactionUuid = `THRIFTLY-${uuidv4()}-${id}`;
        const totalAmount = String(product.price).replace(/,/g, ''); 
        const productCode = "EPAYTEST";
        const signatureString = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
        const secretKey = "8gBm/:&EnhH.1/q"; 
        const hash = CryptoJS.HmacSHA256(signatureString, secretKey);
        const signature = CryptoJS.enc.Base64.stringify(hash);

        const params = { 
            amount: totalAmount, tax_amount: "0", total_amount: totalAmount, 
            transaction_uuid: transactionUuid, product_code: productCode, 
            product_service_charge: "0", product_delivery_charge: "0", 
            success_url: `http://localhost:5173/payment-success?pid=${id}&seller_id=${product.seller_id}`, 
            failure_url: "http://localhost:5173/payment-failed", 
            signed_field_names: "total_amount,transaction_uuid,product_code", 
            signature: signature 
        };
        
        const form = document.createElement("form");
        form.setAttribute("method", "POST");
        form.setAttribute("action", "https://rc-epay.esewa.com.np/api/epay/main/v2/form");
        for (const key in params) {
            const hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);
            form.appendChild(hiddenField);
        }
        document.body.appendChild(form);
        form.submit();
    };

    const handleChat = () => {
        if (!user) return navigate('/login');
        const phone = product.seller_phone || "9800000000"; 
        const text = `Hi, I am interested in your item "${product.title}" on ThriftLy.`;
        window.open(`https://wa.me/977${phone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (!product) return <div className="text-center mt-20 text-stone-500">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-6 font-sans pt-24">
            
            {/* PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-center p-6 relative">
                        <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"><X size={24}/></button>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-green-600 font-bold text-2xl">eSewa</span>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Pay with eSewa</h2>
                        <p className="text-stone-500 mb-6">Price: <span className="text-stone-900 font-bold">Rs. {product.price}</span></p>
                        <button onClick={handleEsewaPayment} className="w-full bg-[#60BB46] text-white py-4 rounded-xl font-bold hover:bg-[#52a13b] transition shadow-lg shadow-green-100">Proceed to eSewa</button>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl w-full flex flex-col md:flex-row gap-12 border border-stone-100 mb-16">
                    
                    {/* LEFT SIDE: IMAGE GALLERY */}
                    <div className="md:w-1/2">
                        <Link to="/" className="flex items-center gap-2 text-stone-500 mb-6 hover:text-orange-600 transition font-medium">
                            <ArrowLeft size={18} /> Back to Shop
                        </Link>
                        
                        {/* 1. Main Large Image */}
                        <div className="rounded-2xl overflow-hidden bg-stone-100 h-[400px] md:h-[500px] shadow-inner relative mb-4">
                            <img 
                                src={`http://localhost:5000/uploads/${activeImage || product.image_url}`} 
                                className={`w-full h-full object-cover transition-all duration-300 ${product.is_sold ? 'grayscale opacity-50' : ''}`}
                                alt="Main Product"
                            />
                            {product.is_sold === 1 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <span className="bg-red-600 text-white px-8 py-3 rounded-full text-xl font-bold uppercase tracking-widest rotate-[-10deg]">Sold Out</span>
                                </div>
                            )}
                        </div>

                        {/* 2. Thumbnails List */}
                        {product.images && product.images.length > 0 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {/* Always show the main image first if it's not in the list, but backend usually handles this */}
                                {product.images.map((img, index) => (
                                    <img 
                                        key={index}
                                        src={`http://localhost:5000/uploads/${img}`}
                                        onClick={() => setActiveImage(img)}
                                        className={`w-20 h-20 rounded-xl object-cover cursor-pointer border-2 transition ${activeImage === img ? 'border-stone-900 scale-95' : 'border-transparent hover:border-stone-300'}`}
                                        alt={`Thumbnail ${index}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE: INFO */}
                    <div className="md:w-1/2 flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-xs font-bold uppercase w-fit mb-4">{product.category}</span>
                            <div className="text-right">
                                <div className="text-xs text-stone-400">Seller</div>
                                <div className="font-bold text-stone-900 flex items-center gap-1">
                                    {product.seller_name} 
                                    {sellerRating.count > 0 && <span className="flex items-center bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] ml-1"><Star size={10} className="fill-yellow-700 mr-0.5"/> {Number(sellerRating.avg).toFixed(1)}</span>}
                                </div>
                            </div>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-6 leading-tight">{product.title}</h1>
                        <p className="text-stone-500 mb-8 leading-relaxed text-lg border-b border-stone-100 pb-8">{product.description}</p>
                        
                        {/* Size & Condition Badges */}
                        <div className="flex gap-4 mb-8">
                            <div className="flex items-center gap-2 bg-stone-50 px-4 py-3 rounded-xl border border-stone-100">
                                <Tag size={18} className="text-stone-400"/>
                                <div>
                                    <p className="text-[10px] text-stone-400 font-bold uppercase">Size</p>
                                    <p className="text-sm font-bold text-stone-900">{product.size || "Free"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-stone-50 px-4 py-3 rounded-xl border border-stone-100">
                                <ShieldCheck size={18} className="text-stone-400"/>
                                <div>
                                    <p className="text-[10px] text-stone-400 font-bold uppercase">Condition</p>
                                    <p className="text-sm font-bold text-stone-900">{product.item_condition || "Good"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-4xl font-bold text-stone-900 mb-8">Rs. {product.price}</div>
                        
                        {product.is_sold === 1 ? (
                            <button disabled className="w-full bg-stone-200 text-stone-400 py-4 rounded-xl font-bold cursor-not-allowed text-lg">Item Sold</button>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <button onClick={() => user ? setShowPaymentModal(true) : navigate('/login')} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition flex justify-center items-center gap-3 shadow-lg shadow-orange-100">
                                    <ShoppingBag size={22} /> Buy Now
                                </button>
                                <button onClick={handleChat} className="w-full bg-white border-2 border-stone-200 text-stone-700 py-4 rounded-xl font-bold text-lg hover:bg-green-50 hover:border-green-500 hover:text-green-600 transition flex justify-center items-center gap-3">
                                    <MessageCircle size={22} /> Chat with Seller
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-16">
                        <h2 className="text-2xl font-bold text-stone-900 mb-6">You might also like</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {relatedProducts.map(item => (
                                <Link to={`/product/${item.id}`} key={item.id} className="bg-white p-4 rounded-2xl border border-stone-100 hover:shadow-lg transition group">
                                    <div className="aspect-square bg-stone-100 rounded-xl overflow-hidden mb-3">
                                        <img src={`http://localhost:5000/uploads/${item.image_url}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
                                    </div>
                                    <h3 className="font-bold text-stone-900 truncate">{item.title}</h3>
                                    <p className="text-orange-600 font-bold text-sm">Rs. {item.price}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetails;