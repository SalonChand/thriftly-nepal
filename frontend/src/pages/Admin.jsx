import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
// 1. Changed DollarSign to Banknote
import { Trash2, Shield, User, Package, Banknote, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // Data States
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    
    // UI States
    const [activeTab, setActiveTab] = useState('orders'); 
    const [totalRevenue, setTotalRevenue] = useState(0);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            const timer = setTimeout(() => { 
                if (!user || user.role !== 'admin') navigate('/'); 
            }, 500);
            return () => clearTimeout(timer);
        }
        refreshData();
    }, [user, navigate]);

    const refreshData = () => {
        axios.get('http://localhost:5000/users').then(res => setUsers(res.data));
        axios.get('http://localhost:5000/all-products').then(res => setProducts(res.data));
        axios.get('http://localhost:5000/admin/orders').then(res => {
            setOrders(res.data);
            const total = res.data.reduce((sum, order) => sum + Number(order.price), 0);
            setTotalRevenue(total);
        });
    };

    const deleteUser = (id) => { if(window.confirm("Delete User?")) axios.delete(`http://localhost:5000/users/${id}`).then(() => refreshData()); };
    const deleteProduct = (id) => { if(window.confirm("Delete Product?")) axios.delete(`http://localhost:5000/products/${id}`).then(() => refreshData()); };

    if (!user || user.role !== 'admin') return <div className="p-10 text-center">Checking Privileges...</div>;

    return (
        <div className="min-h-screen bg-stone-900 text-white p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-stone-700 pb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-600 p-3 rounded-xl shadow-lg shadow-red-900/20">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                            <p className="text-stone-400 text-sm">ThriftLy Management System</p>
                        </div>
                    </div>
                    
                    {/* TOTAL REVENUE CARD */}
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700 flex items-center gap-4">
                        <div className="bg-green-500/10 p-3 rounded-full text-green-500">
                            {/* Generic Money Icon */}
                            <Banknote size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-stone-400 uppercase font-bold">Total Sales Volume</div>
                            <div className="text-2xl font-bold text-white">Rs. {totalRevenue.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'orders' ? 'bg-green-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
                        <Banknote size={18} /> Finance ({orders.length})
                    </button>
                    <button onClick={() => setActiveTab('products')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'products' ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
                        <Package size={18} /> Products ({products.length})
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
                        <User size={18} /> Users ({users.length})
                    </button>
                </div>
                
                {/* FINANCE TAB */}
                {activeTab === 'orders' && (
                    <div className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-stone-900 text-stone-400 uppercase text-xs">
                                <tr>
                                    <th className="p-5">Product Sold</th>
                                    <th className="p-5">Price</th>
                                    <th className="p-5">Buyer</th>
                                    <th className="p-5">Seller (Payout To)</th>
                                    <th className="p-5">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-700">
                                {orders.map(o => (
                                    <tr key={o.id} className="hover:bg-stone-700/50 transition">
                                        <td className="p-5 flex items-center gap-3">
                                            <img src={`http://localhost:5000/uploads/${o.image_url}`} className="w-10 h-10 rounded-lg object-cover bg-stone-900"/>
                                            <span className="font-medium">{o.title}</span>
                                        </td>
                                        <td className="p-5 font-bold text-green-400">Rs. {o.price}</td>
                                        <td className="p-5 text-stone-300">{o.buyer_name}</td>
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-orange-400">{o.seller_name}</span>
                                                <a href={`https://wa.me/977${o.seller_phone}`} target="_blank" rel="noreferrer" className="text-xs text-stone-500 hover:text-green-500 flex items-center gap-1 mt-1">
                                                    <ExternalLink size={10} /> {o.seller_phone}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm text-stone-500">{new Date(o.order_date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {orders.length === 0 && <div className="p-10 text-center text-stone-500">No sales yet.</div>}
                    </div>
                )}

                {/* PRODUCTS TAB */}
                {activeTab === 'products' && (
                    <div className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
                        <table className="w-full text-left">
                            <thead className="bg-stone-900 text-stone-400 uppercase text-xs"><tr><th className="p-5">Item</th><th className="p-5">Status</th><th className="p-5">Action</th></tr></thead>
                            <tbody className="divide-y divide-stone-700">{products.map(p => (
                                <tr key={p.id} className="hover:bg-stone-700/50">
                                    <td className="p-5 flex items-center gap-3">
                                        <img src={`http://localhost:5000/uploads/${p.image_url}`} className="w-10 h-10 rounded object-cover bg-stone-900"/>
                                        {p.title}
                                    </td>
                                    <td className="p-5"><span className={`px-2 py-1 rounded text-xs font-bold ${p.is_sold ? 'bg-green-900 text-green-400' : 'bg-stone-900 text-stone-400'}`}>{p.is_sold ? 'SOLD' : 'ACTIVE'}</span></td>
                                    <td className="p-5"><button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:bg-red-900/20 p-2 rounded transition"><Trash2 size={18}/></button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'users' && (
                    <div className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
                        <table className="w-full text-left">
                            <thead className="bg-stone-900 text-stone-400 uppercase text-xs"><tr><th className="p-5">Username</th><th className="p-5">Role</th><th className="p-5">Action</th></tr></thead>
                            <tbody className="divide-y divide-stone-700">{users.map(u => (
                                <tr key={u.id} className="hover:bg-stone-700/50">
                                    <td className="p-5 font-bold flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs">{u.username[0].toUpperCase()}</div>
                                        {u.username}
                                    </td>
                                    <td className="p-5"><span className={`text-xs px-2 py-1 rounded ${u.role === 'admin' ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'}`}>{u.role}</span></td>
                                    <td className="p-5">{u.role !== 'admin' && <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:bg-red-900/20 p-2 rounded transition"><Trash2 size={18}/></button>}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
export default Admin;