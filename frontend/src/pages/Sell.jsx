import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast'; // Used the new toast system

const Sell = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("Men"); // Default
    const [size, setSize] = useState("Free");
    const [condition, setCondition] = useState("Good");
    const [file, setFile] = useState(null);

    useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

    const handleUpload = (e) => {
        e.preventDefault();
        if (!file) return toast.error("Please select an image!");
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('category', category);
        formData.append('size', size);
        formData.append('condition', condition);

        const loadingToast = toast.loading("Uploading...");

        axios.post('http://localhost:5000/products', formData, { withCredentials: true })
            .then(res => {
                toast.dismiss(loadingToast);
                if(res.data.Status === "Success") {
                    toast.success("Item Listed Successfully!");
                    navigate('/profile'); 
                } else {
                    toast.error("Upload failed: " + res.data.Error);
                }
            })
            .catch(err => {
                toast.dismiss(loadingToast);
                console.log(err);
                toast.error("Something went wrong");
            });
    }

    if (!user) return null; 

    return (
        <div className="flex justify-center items-center min-h-[80vh] bg-[#FDFBF7] p-6 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-100 w-full max-w-lg">
                <h2 className="text-3xl font-serif font-bold text-stone-900 mb-6">Sell an Item</h2>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Title</label>
                        <input type="text" onChange={e => setTitle(e.target.value)} required className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none focus:border-orange-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                        <textarea onChange={e => setDescription(e.target.value)} required className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 h-24 outline-none focus:border-orange-500"></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Price (Rs.)</label>
                            <input type="number" onChange={e => setPrice(e.target.value)} required className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none focus:border-orange-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Category</label>
                            <select onChange={e => setCategory(e.target.value)} className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none focus:border-orange-500 cursor-pointer">
                                {/* 🆕 UPDATED CATEGORIES */}
                                <option value="Men">Men's</option>
                                <option value="Women">Women's</option>
                                <option value="Kids">Kid's</option>
                                <option value="Toys">Toys</option>
                                <option value="Beauty">Beauty</option>
                                <option value="Home">Home & Decor</option>
                                <option value="Sports">Sports</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Accessories">Accessories</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Size</label>
                            <select onChange={e => setSize(e.target.value)} className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none focus:border-orange-500 cursor-pointer">
                                <option>Free</option><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Condition</label>
                            <select onChange={e => setCondition(e.target.value)} className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none focus:border-orange-500 cursor-pointer">
                                <option>Brand New</option><option>Like New</option><option>Good</option><option>Fair</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:bg-stone-50 cursor-pointer relative transition">
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setFile(e.target.files[0])} required />
                        <div className="flex flex-col items-center">
                            <UploadCloud className="text-orange-500 mb-2" size={32} />
                            <p className="text-stone-600 font-medium">Click to upload photo</p>
                            <p className="text-stone-400 text-xs mt-1">{file ? file.name : "JPG, PNG supported"}</p>
                        </div>
                    </div>
                    <button className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg mt-4">List Item</button>
                </form>
            </div>
        </div>
    );
};
export default Sell;