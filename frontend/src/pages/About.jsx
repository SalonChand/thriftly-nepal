import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
    return (
        <div className="min-h-screen bg-[#FDFBF7] p-6 md:p-12 font-sans text-stone-900">
            <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-5xl font-serif font-bold mb-6">Our Story</h1>
                <p className="text-xl text-stone-500 leading-relaxed mb-12">
                    ThriftLy started with a simple idea: <b>Fashion shouldn't cost the Earth.</b>
                    <br/><br/>
                    Founded in Nepal, we are a community-driven marketplace dedicated to giving pre-loved clothes a second chance. We believe that style is eternal, even if clothes are temporary. By buying and selling on ThriftLy, you are reducing waste, saving money, and supporting local closets.
                </p>
                
                <div className="grid md:grid-cols-3 gap-8 text-center mb-16">
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-100">
                        <div className="text-4xl mb-4">🇳🇵</div>
                        <h3 className="font-bold text-lg">Made in Nepal</h3>
                        <p className="text-sm text-stone-500">Built for our community.</p>
                    </div>
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-100">
                        <div className="text-4xl mb-4">♻️</div>
                        <h3 className="font-bold text-lg">Sustainable</h3>
                        <p className="text-sm text-stone-500">Reducing fashion waste.</p>
                    </div>
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-100">
                        <div className="text-4xl mb-4">🔐</div>
                        <h3 className="font-bold text-lg">Secure</h3>
                        <p className="text-sm text-stone-500">Verified buyers & sellers.</p>
                    </div>
                </div>

                <Link to="/" className="bg-stone-900 text-white px-8 py-4 rounded-full font-bold hover:bg-orange-600 transition">Start Shopping</Link>
            </div>
        </div>
    );
};
export default About;