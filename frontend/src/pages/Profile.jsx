import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ShoppingBag, CheckCircle, Trash2, Heart, Edit2, Camera, X, Star, Package, Truck, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils'; // 👈 IMPORT HELPER

const Profile = () => {
    const { user, login, logout } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('listings'); 
    
    const [listings, setListings] = useState([]);
    const [orders, setOrders] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [mySales, setMySales] = useState([]);
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState("");
    const [editBio, setEditBio] = useState("");
    const [editFile, setEditFile] = useState(null);

    const [showRateModal, setShowRateModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [selectedSellerId, setSelectedSellerId] = useState(null);

    useEffect(() => {
        if (user && user.id) {
            setEditName(user.username || "");
            setEditBio(user.bio || "");
            refreshData();
        }
    }, [user]);

    const refreshData = () => {
        if(!user) return;
        axios.get(`http://localhost:5000/my-listings/${user.id}`).then(res => setListings(Array.isArray(res.data) ? res.data : [])).catch(() => setListings([]));
        axios.get(`http://localhost:5000/my-orders/${user.id}`).then(res => setOrders(Array.isArray(res.data) ? res.data : [])).catch(() => setOrders([]));
        axios.get(`http://localhost:5000/wishlist/${user.id}`).then(res => setWishlist(Array.isArray(res.data) ? res.data : [])).catch(() => setWishlist([]));
        axios.get(`http://localhost:5000/my-sales/${user.id}`).then(res => setMySales(Array.isArray(res.data) ? res.data : [])).catch(() => setMySales([]));
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

    const updateStatus = (orderId, newStatus) => {
        axios.put(`http://localhost:5000/order-status/${orderId}`, { status: newStatus }, { withCredentials: true })
            .then(res => {
                if(res.data.Status === "Success") {
                    toast.success(`Order marked as ${newStatus}`);
                    setMySales(mySales.map(sale => sale.order_id === orderId ? {...sale, status: newStatus} : sale));
                }
            });
    };

    const handleSubmitReview = () => {
        axios.post('http://localhost:5000/reviews', {
            seller_id: selectedSellerId,
            rating,
            comment
        }, { withCredentials: true }).then(res => {
            if(res.data.Status === "Success") {
                toast.success("Review Submitted!");
                setShowRateModal(false);
                setComment("");
            } else {
                toast.error(res.data.Error);
            }
        });
    };

    if (!user) return <div className="text-center mt-20 font-sans">Please login first.</div>;

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-6 font-sans pt-24">
            
            {showRateModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-fade-in"><h2 className="text-xl font-serif font-bold mb-4">Rate Seller</h2><div className="flex justify-center gap-2 mb-4">{[1,2,3,4,5].map(star => (<Star key={star} size={32} className={`cursor-pointer transition ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300'}`} onClick={() => setRating(star)} />))}</div><textarea placeholder="Write a review..." className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 h-24 mb-4" onChange={e => setComment(e.target.value)}></textarea><div className="flex gap-2"><button onClick={() => setShowRateModal(false)} className="flex-1 py-3 rounded-xl border border-stone-200 font-bold text-stone-500">Cancel</button><button onClick={handleSubmitReview} className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-bold">Submit</button></div></div></div>)}

            {showEditModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl p-8 w-full max-w-md relative shadow-2xl"><button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X /></button><h2 className="text-2xl font-bold mb-6">Edit Profile</h2><form onSubmit={handleUpdateProfile} className="space-y-4"><div className="flex justify-center mb-6"><label className="cursor-pointer relative group"><div className="w-24 h-24 rounded-full bg-stone-100 overflow-hidden border-4 border-white shadow-lg"><img src={editFile ? URL.createObjectURL(editFile) : getImageUrl(user.profile_pic)} className="w-full h-full object-cover" /></div><div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-full text-white"><Camera size={24}/></div><input type="file" className="hidden" onChange={e => setEditFile(e.target.files[0])} /></label></div><input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Username" className="w-full p-3 border rounded-xl bg-stone-50" /><textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Bio..." className="w-full p-3 border rounded-xl h-24 bg-stone-50" /><button className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold">Save Changes</button></form></div></div>)}

            <div className="max-w-6xl mx-auto">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex flex-col md:flex-row items-center gap-8 mb-10 relative">
                    <button onClick={() => setShowEditModal(true)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 bg-stone-50 p-2 rounded-full"><Edit2 size={18}/></button>
                    <div className="w-28 h-28 bg-stone-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg shrink-0">
                        <img src={getImageUrl(user.profile_pic)} className="w-full h-full object-cover" alt="Profile"/>
                    </div>
                    <div className="text-center md:text-left flex-grow">
                        <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">{user.username}</h1>
                        <p className="text-stone-500 text-sm mb-4 max-w-md mx-auto md:mx-0 leading-relaxed">{user.bio || "No bio yet."}</p>
                    </div>
                    <button onClick={logout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition"><Trash2 size={18} /> Logout</button>
                </div>

                <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('listings')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'listings' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border'}`}><Package size={18} /> My Listings</button>
                    <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border'}`}><ShoppingBag size={18} /> My Orders</button>
                    <button onClick={() => setActiveTab('sales')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap ${activeTab === 'sales' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border'}`}><Truck size={18} /> My Sales</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTab === 'listings' && listings.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border flex gap-4 relative">
                            <img src={getImageUrl(item.image_url)} className="w-24 h-24 rounded-lg object-cover bg-stone-100" />
                            <div><h3 className="font-bold">{item.title}</h3><p className="text-orange-600 font-bold">Rs. {item.price}</p><span className="text-xs bg-stone-100 px-2 py-1 rounded mt-2 inline-block">{item.is_sold ? 'SOLD' : 'ACTIVE'}</span></div>
                            <button onClick={() => handleDelete(item.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                        </div>
                    ))}

                    {activeTab === 'wishlist' && wishlist.map(item => (
                        <div key={item.wishlist_id} className="bg-white p-4 rounded-2xl border flex gap-4 relative">
                            <img src={getImageUrl(item.image_url)} className="w-24 h-24 rounded-lg object-cover bg-stone-100" />
                            <div><h3 className="font-bold">{item.title}</h3><p className="text-orange-600 font-bold">Rs. {item.price}</p></div>
                            <div className="absolute top-4 right-4 text-red-500"><Heart size={20} fill="currentColor"/></div>
                        </div>
                    ))}

                    {activeTab === 'orders' && orders.map(order => (
                         <div key={order.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4">
                            <div className="flex gap-4">
                                <img src={getImageUrl(order.image_url)} className="w-16 h-16 rounded-lg object-cover bg-stone-100" />
                                <div><h3 className="font-bold">{order.title}</h3><p className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Paid</p></div>
                            </div>
                            <button onClick={() => { setSelectedSellerId(order.seller_id); setShowRateModal(true); }} className="text-xs bg-stone-900 text-white px-3 py-2 rounded-lg font-bold w-full hover:bg-orange-600">Rate Seller</button>
                         </div>
                    ))}

                    {activeTab === 'sales' && mySales.map(sale => (
                        <div key={sale.order_id} className="bg-white p-6 rounded-2xl border shadow-sm">
                            <div className="flex gap-4 mb-4">
                                <img src={getImageUrl(sale.image_url)} className="w-16 h-16 rounded-lg object-cover bg-stone-100"/>
                                <div><h3 className="font-bold">{sale.title}</h3><p className="text-sm text-stone-500">Buyer: {sale.buyer_name}</p></div>
                            </div>
                            <div className="bg-stone-50 p-2 rounded-xl flex justify-between gap-2">
                                <button onClick={() => updateStatus(sale.order_id, 'Shipped')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${sale.status === 'Shipped' ? 'bg-blue-100 text-blue-700' : 'bg-white'}`}>Shipped</button>
                                <button onClick={() => updateStatus(sale.order_id, 'Delivered')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${sale.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-white'}`}>Delivered</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default Profile;