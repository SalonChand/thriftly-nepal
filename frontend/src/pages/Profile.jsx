import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Package, ShoppingBag, Settings, Camera, LogOut, Trash2, Star, Truck, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user, logout } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('listings');
    const [myListings, setMyListings] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [mySales, setMySales] = useState([]); // 🚚 NEW: Sales Data

    // Profile Edit
    const [newBio, setNewBio] = useState(user?.bio || "");
    const [newUsername, setNewUsername] = useState(user?.username || "");
    const [newImage, setNewImage] = useState(null);

    // Review Modal
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewTarget, setReviewTarget] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");

    useEffect(() => {
        if (user) {
            axios.get(`http://localhost:5000/my-listings/${user.id}`).then(res => setMyListings(res.data));
            axios.get(`http://localhost:5000/my-orders/${user.id}`).then(res => setMyOrders(res.data));
            axios.get(`http://localhost:5000/my-sales/${user.id}`).then(res => setMySales(res.data)); // 🚚 Fetch Sales
        }
    }, [user]);

    const handleUpdateProfile = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('username', newUsername);
        formData.append('bio', newBio);
        if (newImage) formData.append('profile_pic', newImage);
        axios.put(`http://localhost:5000/user/${user.id}`, formData).then(res => {
            if(res.data.Status === "Success") { toast.success("Profile Updated!"); logout(); }
        });
    };

    const updateStatus = (orderId, newStatus) => {
        axios.put(`http://localhost:5000/order-status/${orderId}`, { status: newStatus }, { withCredentials: true })
            .then(res => {
                if(res.data.Status === "Success") {
                    toast.success(`Order marked as ${newStatus}`);
                    // Update UI immediately
                    setMySales(mySales.map(sale => sale.order_id === orderId ? {...sale, status: newStatus} : sale));
                }
            });
    };

    // Review Logic (Existing)
    const openReviewModal = (sellerId, sellerName) => { setReviewTarget({ id: sellerId, name: sellerName }); setShowReviewModal(true); };
    const submitReview = () => {
        axios.post('http://localhost:5000/reviews', { seller_id: reviewTarget.id, rating, comment }, { withCredentials: true })
        .then(res => {
            if(res.data.Status === "Success") { toast.success("Review Submitted!"); setShowReviewModal(false); }
            else toast.error(res.data.Error);
        });
    };

    if (!user) return <div className="p-20 text-center">Please Login</div>;

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-6 font-sans relative">
            
            {/* Review Modal code remains same... (Hidden for brevity) */}
            {showReviewModal && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative"><h2 className="text-xl font-bold mb-2">Rate Seller</h2><div className="flex justify-center gap-2 mb-4">{[1, 2, 3, 4, 5].map(star => (<button key={star} onClick={() => setRating(star)} className={`transition ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-stone-300'}`}><Star size={32} /></button>))}</div><textarea placeholder="Comment..." className="w-full p-3 bg-stone-50 rounded-lg border mb-4" onChange={e => setComment(e.target.value)}></textarea><button onClick={submitReview} className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold">Submit</button><button onClick={() => setShowReviewModal(false)} className="mt-2 text-stone-400 text-sm">Cancel</button></div></div>)}

            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 mb-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-stone-100">
                        {user.profile_pic ? <img src={`http://localhost:5000/uploads/${user.profile_pic}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-stone-300">{user.username[0]}</div>}
                    </div>
                    <div className="text-center md:text-left flex-grow">
                        <h1 className="text-3xl font-serif font-bold text-stone-900">{user.username}</h1>
                        <p className="text-stone-500 mt-2 max-w-md">{user.bio || "No bio yet."}</p>
                    </div>
                    <button onClick={logout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition"><LogOut size={18} /> Logout</button>
                </div>

                {/* TABS */}
                <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('listings')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'listings' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border'}`}><Package size={18} /> My Listings</button>
                    <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border'}`}><ShoppingBag size={18} /> My Orders</button>
                    {/* 🚚 NEW TAB */}
                    <button onClick={() => setActiveTab('sales')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'sales' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border'}`}><Truck size={18} /> My Sales</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border'}`}><Settings size={18} /> Edit Profile</button>
                </div>

                {/* TAB: LISTINGS */}
                {activeTab === 'listings' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {myListings.length === 0 && <p className="text-stone-400 col-span-full text-center">No listings.</p>}
                        {myListings.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-2xl border flex gap-4 relative">
                                <img src={`http://localhost:5000/uploads/${item.image_url}`} className="w-24 h-24 rounded-lg object-cover bg-stone-100" />
                                <div><h3 className="font-bold">{item.title}</h3><p className="text-orange-600 font-bold">Rs. {item.price}</p><span className="text-xs bg-stone-100 px-2 py-1 rounded mt-2 inline-block">{item.is_sold ? 'SOLD' : 'ACTIVE'}</span></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB: ORDERS (Buyer View) */}
                {activeTab === 'orders' && (
                    <div className="space-y-4">
                        {myOrders.length === 0 && <p className="text-stone-400 text-center">No orders.</p>}
                        {myOrders.map(order => (
                            <div key={order.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600"><ShoppingBag size={24}/></div>
                                    <div>
                                        <h3 className="font-bold text-stone-900">{order.title}</h3>
                                        <p className="text-stone-400 text-sm">Seller: {order.seller_name}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            {/* STATUS BADGE */}
                                            <span className={`text-xs font-bold px-2 py-1 rounded border ${
                                                order.status === 'Delivered' ? 'bg-green-100 text-green-700 border-green-200' : 
                                                order.status === 'Shipped' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                                            }`}>
                                                {order.status || "Pending"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                    <p className="font-bold text-stone-900">Rs. {order.price}</p>
                                    <button onClick={() => openReviewModal(order.seller_id, order.seller_name)} className="bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600">Rate</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 🚚 TAB: SALES (Seller View) */}
                {activeTab === 'sales' && (
                    <div className="space-y-4">
                        {mySales.length === 0 && <p className="text-stone-400 text-center">No sales yet.</p>}
                        {mySales.map(sale => (
                            <div key={sale.order_id} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <img src={`http://localhost:5000/uploads/${sale.image_url}`} className="w-16 h-16 rounded-lg object-cover bg-stone-100"/>
                                        <div>
                                            <h3 className="font-bold text-stone-900">{sale.title}</h3>
                                            <p className="text-sm text-stone-500">Buyer: {sale.buyer_name} ({sale.buyer_phone})</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-600">Rs. {sale.price}</div>
                                        <div className="text-xs text-stone-400">{new Date(sale.order_date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                
                                <div className="bg-stone-50 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                                    <span className="text-sm font-bold text-stone-500">Update Status:</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateStatus(sale.order_id, 'Pending')} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${sale.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white hover:bg-stone-100'}`}><Clock size={14} className="inline mr-1"/> Pending</button>
                                        <button onClick={() => updateStatus(sale.order_id, 'Shipped')} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${sale.status === 'Shipped' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white hover:bg-stone-100'}`}><Truck size={14} className="inline mr-1"/> Shipped</button>
                                        <button onClick={() => updateStatus(sale.order_id, 'Delivered')} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${sale.status === 'Delivered' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white hover:bg-stone-100'}`}><CheckCircle size={14} className="inline mr-1"/> Delivered</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB: SETTINGS (Same as before) */}
                {activeTab === 'settings' && (
                    <div className="bg-white p-8 rounded-3xl border max-w-lg mx-auto">
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="text-center mb-6"><label className="cursor-pointer"><div className="w-24 h-24 rounded-full bg-stone-100 mx-auto flex items-center justify-center overflow-hidden border-2">{newImage ? <img src={URL.createObjectURL(newImage)} className="w-full h-full object-cover"/> : <Camera className="text-stone-400"/>}</div><input type="file" className="hidden" onChange={e => setNewImage(e.target.files[0])}/></label></div>
                            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full p-3 bg-stone-50 rounded-lg border" placeholder="Username"/>
                            <textarea value={newBio} onChange={e => setNewBio(e.target.value)} className="w-full p-3 bg-stone-50 rounded-lg border h-24" placeholder="Bio"></textarea>
                            <button className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold">Save Changes</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
export default Profile;