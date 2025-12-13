import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const Contact = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/contact', { name, email, message })
            .then(res => {
                if(res.data.Status === "Success") {
                    toast.success("Message Sent! We will contact you soon.");
                    setName(""); setEmail(""); setMessage("");
                } else {
                    toast.error("Error sending message.");
                }
            });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-6 font-sans">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 mt-10">
                
                {/* Contact Info */}
                <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 mb-6">Get in Touch</h1>
                    <p className="text-stone-500 mb-8">Have an issue with an order? Want to report a bug? Or just want to say hi? We are here to help.</p>
                    
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"><Mail className="text-orange-600"/></div>
                            <div><h3 className="font-bold">Email</h3><p className="text-stone-500 text-sm">support@thriftlynepal.com</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"><Phone className="text-orange-600"/></div>
                            <div><h3 className="font-bold">Phone</h3><p className="text-stone-500 text-sm">+977 9742590718</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"><MapPin className="text-orange-600"/></div>
                            <div><h3 className="font-bold">Office</h3><p className="text-stone-500 text-sm">Kathmandu, Nepal</p></div>
                        </div>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-stone-100">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Your Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-orange-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-orange-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Message</label>
                            <textarea value={message} onChange={e => setMessage(e.target.value)} required className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 h-32 outline-none focus:border-orange-500"></textarea>
                        </div>
                        <button className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2">
                            <Send size={18}/> Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
export default Contact;