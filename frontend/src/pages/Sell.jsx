import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Sell = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("Men"); // Default
    const [size, setSize] = useState("Free");
    const [condition, setCondition] = useState("Good");
    
    // MULTIPLE FILES STATE
    const [files, setFiles] = useState([]); 
    const [previews, setPreviews] = useState([]);

    useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length + files.length > 5) {
            return toast.error("Maximum 5 images allowed");
        }
        setFiles([...files, ...selectedFiles]);
        
        // Generate Previews
        const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviews([...previews, ...newPreviews]);
    };

    const removeImage = (index) => {
        setFiles(files.filter((_, i) => i !== index));
        setPreviews(previews.filter((_, i) => i !== index));
    };

    const handleUpload = (e) => {
        e.preventDefault();
        if (files.length === 0) return toast.error("Please select at least 1 image!");
        
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('images', file); 
        });

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
                    toast.error("Upload failed");
                }
            })
            .catch(() => { toast.dismiss(loadingToast); toast.error("Server Error"); });
    }

    if (!user) return null; 

    return (
        <div className="flex justify-center items-center min-h-screen bg-[#FDFBF7] p-6 font-sans pt-24">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 w-full max-w-lg">
                <h2 className="text-3xl font-serif font-bold text-stone-900 mb-6">Sell an Item</h2>
                <form onSubmit={handleUpload} className="space-y-4">
                    
                    {/* IMAGE UPLOAD (Multiple) */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {previews.map((src, index) => (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border">
                                <img src={src} className="w-full h-full object-cover"/>
                                <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={12}/></button>
                            </div>
                        ))}
                        {previews.length < 5 && (
                            <label className="aspect-square border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition">
                                <input type="file" className="hidden" multiple onChange={handleFileChange} accept="image/*" />
                                <UploadCloud className="text-orange-500 mb-1" size={24} />
                                <span className="text-xs text-stone-500">Add Photo</span>
                            </label>
                        )}
                    </div>

                    {/* Title */}
                    <input type="text" placeholder="Title" onChange={e => setTitle(e.target.value)} required className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none" />
                    
                    {/* Description */}
                    <textarea placeholder="Description" onChange={e => setDescription(e.target.value)} required className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 h-24 outline-none"></textarea>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {/* Price */}
                        <input type="number" placeholder="Price (Rs)" onChange={e => setPrice(e.target.value)} required className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none" />
                        
                        {/* 🆕 UPDATED CATEGORIES (Synced with Home Page) */}
                        <select onChange={e => setCategory(e.target.value)} className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none cursor-pointer">
                            <option value="Men">Men</option>
                            <option value="Women">Women</option>
                            <option value="Kids">Kids</option>
                            <option value="Toys">Toys</option>
                            <option value="Beauty">Beauty</option>
                            <option value="Home">Home</option>
                            <option value="Art">Art</option> {/* 🎨 Added Art */}
                            <option value="Sports">Sports</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Accessories">Accessories</option>
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {/* Size */}
                        <select onChange={e => setSize(e.target.value)} className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none cursor-pointer">
                            <option>Free</option><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option>
                        </select>
                        {/* Condition */}
                        <select onChange={e => setCondition(e.target.value)} className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none cursor-pointer">
                            <option>Good</option><option>New</option><option>Like New</option><option>Fair</option>
                        </select>
                    </div>

                    <button className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg mt-4">List Item</button>
                </form>
            </div>
        </div>
    );
};
export default Sell;