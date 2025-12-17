import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../utils';
import { CheckCircle, ShoppingBag } from 'lucide-react';

const SellerProfile = () => {
    const { id } = useParams();
    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        // Fetch Public Profile Data
        axios.get(`http://localhost:5000/public-profile/${id}`)
            .then(res => {
                if(res.data.user) {
                    setSeller(res.data.user);
                    setProducts(res.data.products);
                }
            })
            .catch(err => console.log(err));
    }, [id]);

    if (!seller) return <div className="text-center mt-20">Loading Seller...</div>;

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-6 font-sans pt-24">
            <div className="max-w-6xl mx-auto">
                {/* HEADER */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex flex-col md:flex-row items-center gap-8 mb-10 text-center md:text-left">
                    <div className="w-28 h-28 bg-stone-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg shrink-0">
                        <img src={getImageUrl(seller.profile_pic)} className="w-full h-full object-cover" alt="Profile"/>
                    </div>
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">{seller.username}</h1>
                        <p className="text-stone-500 text-sm mb-4 max-w-md leading-relaxed">{seller.bio || "No bio yet."}</p>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <CheckCircle size={12}/> Verified Seller
                            </span>
                            <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-bold">
                                Member since {new Date(seller.created_at).getFullYear()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* LISTINGS GRID */}
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                    <ShoppingBag size={20}/> {products.length} Active Listings
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.length === 0 && <p className="text-stone-400">No items for sale.</p>}
                    
                    {products.map(item => (
                        <Link to={`/product/${item.id}`} key={item.id} className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                            <div className="aspect-square w-full bg-stone-100 relative overflow-hidden">
                                <img src={getImageUrl(item.image_url)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                                {item.size && <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">{item.size}</div>}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-stone-900 truncate text-sm">{item.title}</h3>
                                <div className="mt-2 flex justify-between items-end">
                                    <span className="font-bold text-orange-600">Rs. {item.price}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SellerProfile;