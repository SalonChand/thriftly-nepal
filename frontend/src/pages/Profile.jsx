import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ShoppingBag, CheckCircle, Trash2, Heart, Edit2, Camera, X, Star, Package, Truck, Rocket, Gavel, MessageSquare, Clock } from 'lucide-react'; // Added Clock
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils'; 
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import Chat from '../components/Chat';
import { useLocation } from 'react-router-dom'; // 👈 Needed for auto-tab switching

const Profile = () => {
    const { user, login, logout } = useContext(AuthContext);
    const location = useLocation(); // 👈 Get navigation state
    const [activeTab, setActiveTab] = useState('listings'); 
    
    // Data States
    const [listings, setListings] = useState([]);
    const [orders, setOrders] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [mySales, setMySales] = useState([]);
    const [offers, setOffers] = useState({ received: [], sent: [] });
    const [conversations, setConversations] = useState([]); 
    
    // UI States
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState("");
    const [editBio, setEditBio] = useState("");
    const [editFile, setEditFile] = useState(null);

    const [showRateModal, setShowRateModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [selectedSellerId, setSelectedSellerId] = useState(null);
    const [activeChat, setActiveChat] = useState(null);

    useEffect(() => {
        // 🟢 AUTO-SWITCH TAB BASED ON NOTIFICATION CLICK
        if (location.state && location.state.tab) {
            setActiveTab(location.state.tab);
        }

        if (user && user.id) {
            setEditName(user.username || "");
            setEditBio(user.bio || "");
            refreshData();
        }
    }, [user, location]);

    const refreshData = () => {
        if(!user) return;
        const id = user.id;
        const config = { withCredentials: true };

        axios.get(`http://localhost:5000/my-listings/${id}`).then(res => setListings(Array.isArray(res.data) ? res.data : [])).catch(() => setListings([]));
        axios.get(`http://localhost:5000/my-orders/${id}`).then(res => setOrders(Array.isArray(res.data) ? res.data : [])).catch(() => setOrders([]));
        axios.get(`http://localhost:5000/wishlist/${id}`).then(res => setWishlist(Array.isArray(res.data) ? res.data : [])).catch(() => setWishlist([]));
        axios.get(`http://localhost:5000/my-sales/${id}`).then(res => setMySales(Array.isArray(res.data) ? res.data : [])).catch(() => setMySales([]));
        axios.get(`http://localhost:5000/my-offers/${id}`, config).then(res => setOffers(res.data));
        axios.get(`http://localhost:5000/my-conversations/${id}`, config).then(res => setConversations(res.data));
    };

    const handleDelete = (id) => {
        if(window.confirm("Delete this item?")) {
            axios.delete(`http://localhost:5000/products/${id}`).then(() => refreshData());
        }
    };

    const handleUpdateProfile = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('username', editName);
        formData.append('bio', editBio);
        if(editFile) formData.append('profile_pic', editFile);

        axios.put(`http://localhost:5000/user/${user.id}`, formData)
            .then(res => {
                const updatedUser = { ...user, ...res.data.user };
                login(updatedUser); 
                setShowEditModal(false);
                toast.success("Profile Updated");
            });
    };

    const handleOfferAction = (offerId, status) => {
        axios.put(`http://localhost:5000/offers/${offerId}`, { status }, { withCredentials: true }).then(() => {
            toast.success(`Offer ${status}`);
            refreshData();
        });
    };

    const handleBoost = (productId) => {
        const boostPrice = "50"; 
        const transactionUuid = `BOOST-${uuidv4()}-${productId}`;
        const productCode = "EPAYTEST";
        const signatureString = `total_amount=${boostPrice},transaction_uuid=${transactionUuid},product_code=${productCode}`;
        const secretKey = "8gBm/:&EnhH.1/q"; 
        const hash = CryptoJS.HmacSHA256(signatureString, secretKey);
        const signature = CryptoJS.enc.Base64.stringify(hash);

        const params = { amount: boostPrice, tax_amount: "0", total_amount: boostPrice, transaction_uuid: transactionUuid, product_code: productCode, product_service_charge: "0", product_delivery_charge: "0", success_url: `http://localhost:5173/payment-success?pid=${productId}&type=boost`, failure_url: "http://localhost:5173/profile", signed_field_names: "total_amount,transaction_uuid,product_code", signature: signature };
        const form = document.createElement("form"); form.setAttribute("method", "POST"); form.setAttribute("action", "https://rc-epay.esewa.com.np/api/epay/main/v2/form");
        for (const key in params) { const hiddenField = document.createElement("input"); hiddenField.setAttribute("type", "hidden"); hiddenField.setAttribute("name", key); hiddenField.setAttribute("value", params[key]); form.appendChild(hiddenField); }
        document.body.appendChild(form); form.submit();
    };

    const updateStatus = (orderId, newStatus) => {
        axios.put(`http://localhost:5000/order-status/${orderId}`, { status: newStatus }, { withCredentials: true })
            .then(res => { if(res.data.Status === "Success") { toast.success(`Order marked as ${newStatus}`); setMySales(mySales.map(sale => sale.order_id === orderId ? {...sale, status: newStatus} : sale)); } });
    };

    const handleSubmitReview = () => {
        axios.post('http://localhost:5000/reviews', { seller_id: selectedSellerId, rating, comment }, { withCredentials: true }).then(res => {
            if(res.data.Status === "Success") { toast.success("Review Submitted!"); setShowRateModal(false); setComment(""); }
            else toast.error(res.data.Error);
        });
    };

    if (!user) return <div className="text-center mt-20 font-sans">Please login first.</div>;

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-6 font-sans pt-24">
            
            {/* CHAT */}
            {activeChat && (<Chat currentUser={user} sellerId={activeChat.other_user_id} productId={activeChat.product_id} onClose={() => setActiveChat(null)} />)}

            {/* MODALS */}
            {showRateModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-fade-in"><h2 className="text-xl font-serif font-bold mb-4">Rate Seller</h2><div className="flex justify-center gap-2 mb-4">{[1,2,3,4,5].map(star => (<Star key={star} size={32} className={`cursor-pointer transition ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300'}`} onClick={() => setRating(star)} />))}</div><textarea placeholder="Write a review..." className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 h-24 mb-4" onChange={e => setComment(e.target.value)}></textarea><div className="flex gap-2"><button onClick={() => setShowRateModal(false)} className="flex-1 py-3 rounded-xl border border-stone-200 font-bold text-stone-500">Cancel</button><button onClick={handleSubmitReview} className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-bold">Submit</button></div></div></div>)}
            {showEditModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl p-8 w-full max-w-md relative shadow-2xl"><button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X /></button><h2 className="text-2xl font-bold mb-6">Edit Profile</h2><form onSubmit={handleUpdateProfile} className="space-y-4"><div className="flex justify-center mb-6"><label className="cursor-pointer relative group"><div className="w-24 h-24 rounded-full bg-stone-100 overflow-hidden border-4 border-white shadow-lg"><img src={editFile ? URL.createObjectURL(editFile) : getImageUrl(user.profile_pic)} className="w-full h-full object-cover" /></div><div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-full text-white"><Camera size={24}/></div><input type="file" className="hidden" onChange={e => setEditFile(e.target.files[0])} /></label></div><input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Username" className="w-full p-3 border rounded-xl bg-stone-50" /><textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Bio..." className="w-full p-3 border rounded-xl h-24 bg-stone-50" /><button className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold">Save Changes</button></form></div></div>)}

            <div className="max-w-6xl mx-auto">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex flex-col md:flex-row items-center gap-8 mb-10 relative">
                    <button onClick={() => setShowEditModal(true)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 bg-stone-50 p-2 rounded-full"><Edit2 size={18}/></button>
                    <div className="w-28 h-28 bg-stone-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg shrink-0"><img src={getImageUrl(user.profile_pic)} className="w-full h-full object-cover" alt="Profile"/></div>
                    <div className="text-center md:text-left flex-grow"><h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">{user.username}</h1><p className="text-stone-500 text-sm mb-4 max-w-md mx-auto md:mx-0 leading-relaxed">{user.bio || "No bio yet."}</p><div className="flex items-center justify-center md:justify-start gap-3"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Verified</span></div></div>
                    <button onClick={logout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition"><Trash2 size={18} /> Logout</button>
                </div>

                <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                    {['listings', 'offers', 'messages', 'orders', 'sales', 'wishlist'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap uppercase text-sm ${activeTab === tab ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border'}`}>
                            {tab === 'listings' && <Package size={18}/>}
                            {tab === 'offers' && <Gavel size={18}/>}
                            {tab === 'messages' && <MessageSquare size={18}/>}
                            {tab === 'orders' && <ShoppingBag size={18}/>}
                            {tab === 'sales' && <Truck size={18}/>}
                            {tab === 'wishlist' && <Heart size={18}/>}
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTab === 'listings' && listings.map(item => (<div key={item.id} className="bg-white p-4 rounded-2xl border flex flex-col gap-4 relative"><div className="flex gap-4"><img src={getImageUrl(item.image_url)} className="w-24 h-24 rounded-lg object-cover bg-stone-100" /><div><h3 className="font-bold">{item.title}</h3><p className="text-orange-600 font-bold">Rs. {item.price}</p><span className="text-xs bg-stone-100 px-2 py-1 rounded mt-2 inline-block">{item.is_sold ? 'SOLD' : 'ACTIVE'}</span></div></div><div className="flex gap-2"><button onClick={() => handleDelete(item.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-100"><Trash2 size={16} className="inline mr-1"/> Delete</button>{item.is_sold === 0 && (<button onClick={() => handleBoost(item.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${item.is_featured ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200'}`}><Rocket size={16} className="inline mr-1"/> {item.is_featured ? "Boosted" : "Boost (Rs 50)"}</button>)}</div></div>))}

                    {/* 🆕 MESSAGES TAB WITH TIME */}
                    {activeTab === 'messages' && (
                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            {conversations.length === 0 && <p className="text-stone-400">No conversations yet.</p>}
                            {conversations.map((conv, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-stone-200 flex justify-between items-center hover:shadow-md transition">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-lg">
                                            {conv.other_user_name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-900">{conv.other_user_name}</p>
                                            <p className="text-xs text-stone-500 flex items-center gap-1">
                                                <Package size={12}/> {conv.title}
                                            </p>
                                            {/* 🕒 TIME ADDED HERE */}
                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                <Clock size={10}/> 
                                                {new Date(conv.last_msg_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveChat(conv)} className="bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600">Reply</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'offers' && (<div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-4"><h3 className="font-bold text-lg text-stone-900 border-b pb-2">Offers Received</h3>{offers.received?.length === 0 && <p className="text-stone-400">No offers received.</p>}{offers.received?.map(offer => (<div key={offer.id} className="bg-white p-4 rounded-xl border border-stone-200 flex justify-between items-center"><div className="flex gap-3"><img src={getImageUrl(offer.image_url)} className="w-12 h-12 rounded-lg object-cover"/><div><p className="font-bold text-sm">{offer.title}</p><p className="text-xs text-stone-500">From: {offer.buyer_name}</p><p className="font-bold text-orange-600">Offer: Rs. {offer.offer_amount}</p></div></div><div className="flex flex-col gap-1">{offer.status === 'pending' ? (<><button onClick={() => handleOfferAction(offer.id, 'accepted')} className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200">Accept</button><button onClick={() => handleOfferAction(offer.id, 'rejected')} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200">Reject</button></>) : (<span className={`px-2 py-1 rounded text-xs font-bold uppercase ${offer.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>{offer.status}</span>)}</div></div>))}</div><div className="space-y-4"><h3 className="font-bold text-lg text-stone-900 border-b pb-2">Offers Sent</h3>{offers.sent?.length === 0 && <p className="text-stone-400">You haven't made any offers.</p>}{offers.sent?.map(offer => (<div key={offer.id} className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex justify-between items-center"><div className="flex gap-3"><img src={getImageUrl(offer.image_url)} className="w-12 h-12 rounded-lg object-cover grayscale"/><div><p className="font-bold text-sm">{offer.title}</p><p className="text-xs text-stone-500">You offered: Rs. {offer.offer_amount}</p></div></div><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${offer.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : offer.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>{offer.status}</span></div>))}</div></div>)}
                    {activeTab === 'wishlist' && wishlist.map(item => (<div key={item.wishlist_id} className="bg-white p-4 rounded-2xl border flex gap-4 relative"><img src={getImageUrl(item.image_url)} className="w-24 h-24 rounded-lg object-cover bg-stone-100" /><div><h3 className="font-bold">{item.title}</h3><p className="text-orange-600 font-bold">Rs. {item.price}</p></div><div className="absolute top-4 right-4 text-red-500"><Heart size={20} fill="currentColor"/></div></div>))}
                    {activeTab === 'orders' && orders.map(order => (<div key={order.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4"><div className="flex gap-4"><img src={getImageUrl(order.image_url)} className="w-16 h-16 rounded-lg object-cover bg-stone-100" /><div><h3 className="font-bold">{order.title}</h3><p className="text-green-600 text-xs font-bold flex items-center gap-1 mb-2"><CheckCircle size={12}/> Paid</p></div></div><button onClick={() => { setSelectedSellerId(order.seller_id); setShowRateModal(true); }} className="text-xs bg-stone-900 text-white px-3 py-2 rounded-lg font-bold w-full hover:bg-orange-600">Rate Seller</button></div>))}
                    {activeTab === 'sales' && mySales.map(sale => (<div key={sale.order_id} className="bg-white p-6 rounded-2xl border shadow-sm"><div className="flex gap-4 mb-4"><img src={getImageUrl(sale.image_url)} className="w-16 h-16 rounded-lg object-cover bg-stone-100"/><div><h3 className="font-bold">{sale.title}</h3><p className="text-sm text-stone-500">Buyer: {sale.buyer_name}</p></div></div><div className="bg-stone-50 p-2 rounded-xl flex justify-between gap-2"><button onClick={() => updateStatus(sale.order_id, 'Shipped')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${sale.status === 'Shipped' ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}>Shipped</button><button onClick={() => updateStatus(sale.order_id, 'Delivered')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${sale.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-white'}`}>Delivered</button></div></div>))}
                </div>
            </div>
        </div>
    );
};
export default Profile;