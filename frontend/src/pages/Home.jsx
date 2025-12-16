import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Search, Heart, ArrowUpDown, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils'; // 👈 Using the helper

const Home = () => {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [wishlistIds, setWishlistIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Filters
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedSize, setSelectedSize] = useState("All");
    const [selectedCondition, setSelectedCondition] = useState("All");
    
    // Sort
    const [sortOption, setSortOption] = useState("Newest");

    const categories = ["All", "Men", "Women", "Kids", "Toys", "Beauty", "Home", "Art", "Sports", "Electronics", "Accessories"];

    // 🔗 API URL (Easier to change here)
    const API_URL = "http://localhost:5000";

    useEffect(() => {
        // Fetch products from Cloud
        axios.get(`${API_URL}/products`)
            .then(res => setProducts(res.data))
            .catch(err => console.log(err));

        if (user) {
            // Fetch wishlist from Cloud
            axios.get(`${API_URL}/wishlist/${user.id}`).then(res => { 
                if(Array.isArray(res.data)) setWishlistIds(res.data.map(item => item.id)); 
            });
        }
    }, [user]);

    const toggleWishlist = (e, productId) => {
        e.preventDefault();
        if(!user) {
            toast.error("Please Login to save items");
            return;
        }
        // Send wishlist action to Cloud
        axios.post(`${API_URL}/wishlist/toggle`, { user_id: user.id, product_id: productId }, { withCredentials: true })
            .then(res => { 
                if(res.data.Status === "Added") {
                    setWishlistIds([...wishlistIds, productId]);
                    toast.success("Added to Wishlist");
                } else {
                    setWishlistIds(wishlistIds.filter(id => id !== productId));
                    toast.success("Removed from Wishlist");
                }
            });
    };

    const filteredProducts = products
        .filter((item) => {
            const title = (item.title || "").toLowerCase();
            const category = (item.category || "").toLowerCase();
            const search = searchTerm.toLowerCase();
            const matchCategory = selectedCategory === "All" || category === selectedCategory.toLowerCase();
            const matchSize = selectedSize === "All" || (item.size && item.size === selectedSize);
            const matchCondition = selectedCondition === "All" || (item.item_condition && item.item_condition === selectedCondition);
            return (title.includes(search) || category.includes(search)) && matchCategory && matchSize && matchCondition;
        })
        .sort((a, b) => {
            if (sortOption === "PriceLow") return a.price - b.price; 
            if (sortOption === "PriceHigh") return b.price - a.price; 
            return b.id - a.id; 
        });

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans">
            
            {/* HERO SECTION */}
            <div className="bg-stone-900 text-white pt-28 pb-16 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4 leading-tight">Thrift<span className="text-orange-500">Ly.</span></h1>
                    <p className="text-stone-300 text-lg mb-8 font-medium">Nepal's #1 Marketplace for Pre-loved Fashion</p>
                    <div className="max-w-lg mx-auto relative group">
                        <input type="text" placeholder="Search brands, items..." className="w-full pl-12 pr-4 py-3.5 rounded-full text-stone-900 border-none outline-none shadow-xl focus:ring-4 focus:ring-orange-500/50 transition" onChange={(e) => setSearchTerm(e.target.value)}/>
                        <Search className="absolute left-5 top-3.5 text-stone-400" size={20} />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20 pb-20">
                <div className="bg-white p-5 rounded-2xl shadow-lg border border-stone-100 mb-8 flex flex-col gap-4 relative">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full font-bold text-sm border whitespace-nowrap transition ${selectedCategory === cat ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-300'}`}>{cat}</button>))}
                    </div>
                    <div className="border-t border-stone-100 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                            <Filter size={16} className="text-stone-400 mr-1"/>
                            <select onChange={(e) => setSelectedSize(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm font-bold outline-none cursor-pointer hover:border-stone-400"><option value="All">Size: All</option><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option></select>
                            <select onChange={(e) => setSelectedCondition(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm font-bold outline-none cursor-pointer hover:border-stone-400"><option value="All">Condition: All</option><option value="Brand New">Brand New</option><option value="Like New">Like New</option><option value="Good">Good</option></select>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <ArrowUpDown size={16} className="text-stone-400" />
                            <select onChange={(e) => setSortOption(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-sm font-bold outline-none cursor-pointer hover:border-orange-500 transition w-full md:w-auto"><option value="Newest">Newest First</option><option value="PriceLow">Price: Low to High</option><option value="PriceHigh">Price: High to Low</option></select>
                        </div>
                    </div>
                </div>

                {/* PRODUCT GRID */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((item) => (
                        <Link to={`/product/${item.id}`} key={item.id} className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                            
                            {/* FIXED IMAGE HEIGHT */}
                            <div className="aspect-square w-full bg-stone-100 relative overflow-hidden">
                                <img src={getImageUrl(item.image_url)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                                
                                <button onClick={(e) => toggleWishlist(e, item.id)} className="absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-sm hover:scale-110 transition z-10 text-stone-400 hover:text-red-500">
                                    <Heart size={18} className={wishlistIds.includes(item.id) ? "fill-red-500 text-red-500" : ""} />
                                </button>
                                {item.size && <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">{item.size}</div>}
                            </div>

                            <div className="p-4 flex flex-col flex-grow">
                                <div className="mb-2"><h3 className="font-bold text-stone-900 truncate text-sm md:text-base leading-tight">{item.title}</h3></div>
                                <div className="mt-auto flex justify-between items-end">
                                    <div><p className="text-[10px] text-stone-400 uppercase font-bold">{item.item_condition || "Used"}</p><span className="font-bold text-orange-600 text-lg">Rs. {item.price}</span></div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
                
                {filteredProducts.length === 0 && <div className="text-center text-stone-400 py-24"><p className="font-medium">No items found.</p></div>}
            </div>
        </div>
    );
};

export default Home;