import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Trash2, Shield, User, Package, Banknote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils'; // 👈 IMPORT HELPER

const Admin = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('orders'); 
    const [totalRevenue, setTotalRevenue] = useState(0);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            const timer = setTimeout(() => { if (!user || user.role !== 'admin') navigate('/'); }, 500);
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
        <div className="min-h-screen bg-stone-900 text-white p-6 font-sans pt-24">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8 border-b border-stone-700 pb-6 gap-4">
                    <div className="flex items-center gap-4"><div className="bg-red-600 p-3 rounded-xl"><Shield size={32} /></div><div><h1 className="text-3xl font-bold">Admin Dashboard</h1></div></div>
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700 flex items-center gap-4"><Banknote size={24} className="text-green-500" /><div><div className="text-xs text-stone-400 uppercase font-bold">Total Sales</div><div className="text-2xl font-bold text-white">Rs. {totalRevenue.toLocaleString()}</div></div></div>
                </div>

                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 ${activeTab === 'orders' ? 'bg-green-600 text-white' : 'bg-stone-800 text-stone-400'}`}><Banknote size={18} /> Finance</button>
                    <button onClick={() => setActiveTab('products')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 ${activeTab === 'products' ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-400'}`}><Package size={18} /> Products</button>
                    <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-400'}`}><User size={18} /> Users</button>
                </div>
                
                {activeTab === 'orders' && (
                    <div className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
                        <table className="w-full text-left"><thead className="bg-stone-900 text-stone-400 uppercase text-xs"><tr><th className="p-5">Item</th><th className="p-5">Price</th><th className="p-5">Buyer</th><th className="p-5">Seller</th><th className="p-5">Date</th></tr></thead>
                            <tbody className="divide-y divide-stone-700">{orders.map(o => (
                                <tr key={o.id} className="hover:bg-stone-700/50">
                                    <td className="p-5 flex items-center gap-3"><img src={getImageUrl(o.image_url)} className="w-10 h-10 rounded-lg object-cover bg-stone-900"/>{o.title}</td>
                                    <td className="p-5 font-bold text-green-400">Rs. {o.price}</td>
                                    <td className="p-5 text-stone-300">{o.buyer_name}</td>
                                    <td className="p-5 text-orange-400">{o.seller_name}</td>
                                    <td className="p-5 text-sm text-stone-500">{new Date(o.order_date).toLocaleDateString()}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
                        <table className="w-full text-left"><thead className="bg-stone-900 text-stone-400 uppercase text-xs"><tr><th className="p-5">Item</th><th className="p-5">Status</th><th className="p-5">Action</th></tr></thead>
                            <tbody className="divide-y divide-stone-700">{products.map(p => (<tr key={p.id} className="hover:bg-stone-700/50"><td className="p-5 flex items-center gap-3"><img src={getImageUrl(p.image_url)} className="w-10 h-10 rounded-lg object-cover bg-stone-900"/>{p.title}</td><td className="p-5"><span className="bg-stone-900 px-2 py-1 rounded text-xs">{p.is_sold ? 'SOLD' : 'ACTIVE'}</span></td><td className="p-5"><button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:bg-red-900/20 p-2 rounded"><Trash2 size={18}/></button></td></tr>))}</tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
                        <table className="w-full text-left"><thead className="bg-stone-900 text-stone-400 uppercase text-xs"><tr><th className="p-5">Username</th><th className="p-5">Role</th><th className="p-5">Action</th></tr></thead>
                            <tbody className="divide-y divide-stone-700">{users.map(u => (<tr key={u.id} className="hover:bg-stone-700/50"><td className="p-5 font-bold">{u.username}</td><td className="p-5">{u.role}</td><td className="p-5">{u.role !== 'admin' && <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:bg-red-900/20 p-2 rounded"><Trash2 size={18}/></button>}</td></tr>))}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
export default Admin;