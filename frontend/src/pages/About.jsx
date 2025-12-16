import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, Instagram } from 'lucide-react';

const About = () => {
    
    // 👥 EDIT YOUR TEAM HERE
    const teamMembers = [
        {
            name: "Salon Chand",
            role: "Founder & Lead Developer",
            image: "/me.jpg", // ⚠️ Make sure me.jpg is in frontend/public folder
            bio: "Passionate about sustainable fashion and technology. Built ThriftLy to give clothes and other items a second life in Nepal.",
            social: {
                linkedin: "#",
                instagram: "#",
                github: "#"
            }
        },
        {
            name: "-",
            role: "Operations Manager",
            image: "", // Placeholder
            bio: "Ensuring every order is packed with love and delivered on time.",
            social: { linkedin: "#", instagram: "#" }
        },
        {
            name: "-",
            role: "Creative Director",
            image: "", // Placeholder
            bio: "Curating the best vintage styles and keeping ThriftLy looking fresh.",
            social: { linkedin: "#", instagram: "#" }
        }
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF7] font-sans pt-24 pb-20">
            
            {/* HERO STORY */}
            <div className="max-w-4xl mx-auto text-center px-6 mb-20">
                <span className="text-orange-600 font-bold tracking-widest text-xs uppercase mb-4 block">Who We Are</span>
                <h1 className="text-5xl font-serif font-bold text-stone-900 mb-6">Built in Nepal, For Nepal.</h1>
                <p className="text-xl text-stone-500 leading-relaxed max-w-2xl mx-auto">
                    ThriftLy started with a simple code and a big dream: <b>To revolutionize how Nepal shops for fashion.</b> 
                    We are bridging the gap between sustainability and style, one pre-loved item at a time.
                </p>
            </div>

            {/* TEAM GRID */}
            <div className="max-w-6xl mx-auto px-6">
                <h2 className="text-3xl font-serif font-bold text-stone-900 mb-10 text-center">Meet the Team</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {teamMembers.map((member, index) => (
                        <div key={index} className="bg-white rounded-3xl overflow-hidden shadow-lg border border-stone-100 hover:-translate-y-2 transition-transform duration-300 group">
                            
                            {/* Image Container */}
                            <div className="h-80 overflow-hidden relative">
                                <img 
                                    src={member.image} 
                                    alt={member.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                                    onError={(e) => {e.target.src = "https://via.placeholder.com/400x500?text=No+Image"}}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-center pb-6">
                                    <div className="flex gap-4 text-white">
                                        {member.social.github && <a href={member.social.github} className="hover:text-orange-400 transition"><Github size={20}/></a>}
                                        {member.social.linkedin && <a href={member.social.linkedin} className="hover:text-orange-400 transition"><Linkedin size={20}/></a>}
                                        {member.social.instagram && <a href={member.social.instagram} className="hover:text-orange-400 transition"><Instagram size={20}/></a>}
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="p-6 text-center">
                                <h3 className="text-xl font-bold text-stone-900">{member.name}</h3>
                                <p className="text-orange-600 text-sm font-bold uppercase tracking-wider mb-3">{member.role}</p>
                                <p className="text-stone-500 text-sm leading-relaxed">{member.bio}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MISSION STATS */}
            <div className="max-w-6xl mx-auto px-6 mt-24">
                <div className="grid md:grid-cols-3 gap-8 text-center bg-stone-900 rounded-3xl p-12 text-white">
                    <div>
                        <div className="text-4xl mb-4">🇳🇵</div>
                        <h3 className="font-bold text-lg mb-2">Locally Crafted</h3>
                        <p className="text-stone-400 text-sm">Designed and developed in Kathmandu.</p>
                    </div>
                    <div>
                        <div className="text-4xl mb-4">♻️</div>
                        <h3 className="font-bold text-lg mb-2">Eco-Conscious</h3>
                        <p className="text-stone-400 text-sm">Promoting circular fashion economy.</p>
                    </div>
                    <div>
                        <div className="text-4xl mb-4">🤝</div>
                        <h3 className="font-bold text-lg mb-2">Community First</h3>
                        <p className="text-stone-400 text-sm">Connecting buyers and sellers directly.</p>
                    </div>
                </div>
            </div>

            <div className="text-center mt-16">
                <Link to="/" className="inline-block bg-orange-600 text-white px-8 py-4 rounded-full font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200">
                    Join Our Journey
                </Link>
            </div>
        </div>
    );
};

export default About;