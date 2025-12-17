import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Camera, Heart, Plus, Video, Image as ImageIcon, Volume2, VolumeX, MessageCircle, Send, Flag, X, ThumbsUp, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const Stories = () => {
    const { user } = useContext(AuthContext);
    
    const [stories, setStories] = useState([]);
    const [activeTab, setActiveTab] = useState('posts');
    const [showModal, setShowModal] = useState(false);
    const [caption, setCaption] = useState("");
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileType, setFileType] = useState("image");

    const [isMuted, setIsMuted] = useState(true);
    
    // COMMENT & SOCIAL STATES
    const [showComments, setShowComments] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState(null); 
    const [expandedComments, setExpandedComments] = useState({});

    // ⚡ REAL-TIME SOCKET CONNECTION
    useEffect(() => {
        fetchStories();
        const socket = io("http://localhost:5000");

        // 1. Listen: Story Likes
        socket.on('story_like_update', ({ storyId, likes }) => {
            setStories(prev => prev.map(s => s.id === storyId ? { ...s, likes } : s));
        });

        // 2. Listen: New Comments
        socket.on('new_comment', ({ storyId, comment }) => {
            if (showComments === storyId) {
                setComments(prev => [...prev, comment]);
            }
            setStories(prev => prev.map(s => s.id === storyId ? { ...s, comment_count: (s.comment_count || 0) + 1 } : s));
        });

        // 3. Listen: Comment Likes
        socket.on('comment_like_update', ({ commentId, likes }) => {
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes } : c));
        });

        return () => socket.disconnect();
    }, [showComments]);

    const fetchStories = () => {
        // We use withCredentials to check if "I" liked the story
        axios.get('http://localhost:5000/stories', { withCredentials: true })
            .then(res => {
                if (Array.isArray(res.data)) setStories(res.data);
                else setStories([]);
            })
            .catch(() => setStories([]));
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreviewUrl(URL.createObjectURL(selected));
            setFileType(selected.type.startsWith('video') ? 'video' : 'image');
        }
    };

    const handleUpload = (e) => {
        e.preventDefault();
        if(!file) return toast.error("Please select a file");
        const formData = new FormData();
        formData.append('media', file);
        formData.append('caption', caption);
        const loading = toast.loading("Posting...");
        axios.post('http://localhost:5000/stories', formData, { withCredentials: true }).then(res => {
            toast.dismiss(loading);
            if(res.data.Status === "Success") { toast.success("Story Posted!"); setShowModal(false); setCaption(""); setFile(null); setPreviewUrl(null); fetchStories(); }
        });
    };

    // ❤️ LIKE STORY (One per person)
    const handleLike = (id) => { 
        // Optimistic UI Update
        setStories(prev => prev.map(s => {
            if(s.id === id) {
                return { 
                    ...s, 
                    likes: s.is_liked_by_me ? s.likes - 1 : s.likes + 1,
                    is_liked_by_me: !s.is_liked_by_me 
                };
            }
            return s;
        }));
        axios.put(`http://localhost:5000/stories/like/${id}`, {}, { withCredentials: true });
    };

    const openComments = (storyId) => {
        setShowComments(storyId);
        setReplyTo(null);
        setExpandedComments({});
        axios.get(`http://localhost:5000/stories/${storyId}/comments`, { params: { userId: user?.id } }).then(res => setComments(res.data || []));
    };
    
    // 💬 POST REPLY
    const postComment = () => {
        if(!newComment) return;
        const payload = { comment: newComment, parent_id: replyTo ? replyTo.id : null };
        
        axios.post(`http://localhost:5000/stories/${showComments}/comment`, payload, { withCredentials: true })
            .then(() => { 
                setNewComment(""); 
                if(replyTo) setExpandedComments(prev => ({ ...prev, [replyTo.id]: true }));
                setReplyTo(null);
                // No need to fetch, socket will update it!
            });
    };

    // 👍 LIKE COMMENT
    const likeComment = (commentId) => {
        // Optimistic UI
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: c.is_liked_by_me ? c.likes - 1 : c.likes + 1, is_liked_by_me: !c.is_liked_by_me } : c));
        axios.post(`http://localhost:5000/comments/like/${commentId}`, {}, { withCredentials: true });
    };

    const toggleReplies = (commentId) => { setExpandedComments(prev => ({ ...prev, [commentId]: !prev[commentId] })); };

    const handleReport = (storyId) => {
        const reason = prompt("Why are you reporting this story?");
        if(reason) {
            axios.post(`http://localhost:5000/stories/${storyId}/report`, { reason }, { withCredentials: true })
                .then(res => { if(res.data.Status === "Success") toast.success("Reported to Admin."); });
        }
    };

    // 🌲 RECURSIVE COMMENT TREE (The Thread System)
    const renderCommentTree = (parentId = null, depth = 0) => {
        const childComments = comments.filter(c => c.parent_id === parentId);
        if (childComments.length === 0) return null;

        return childComments.map(c => {
            const hasReplies = comments.some(reply => reply.parent_id === c.id);
            const isExpanded = expandedComments[c.id];

            return (
                <div key={c.id} className={`flex flex-col ${depth > 0 ? 'mt-2' : 'mb-3'}`}>
                    <div className="flex gap-3 relative group">
                        {depth > 0 && <div className="absolute -left-4 top-0 w-4 h-4 border-l-2 border-b-2 border-stone-200 rounded-bl-xl"></div>}
                        <Link to={`/seller/${c.user_id}`} className="shrink-0 z-10"><img src={getImageUrl(c.profile_pic)} className="w-8 h-8 rounded-full object-cover bg-stone-100 border border-white shadow-sm"/></Link>
                        <div className="flex-1">
                            <div className={`bg-stone-50 p-2.5 rounded-2xl text-sm w-full relative ${c.user_id === user?.id ? 'bg-orange-50 border border-orange-100' : ''}`}><span className="font-bold block text-xs mb-0.5 text-stone-900">{c.username}</span><span className="text-stone-700">{c.comment}</span></div>
                            <div className="flex gap-4 mt-1 text-[10px] text-stone-500 pl-2 font-bold items-center">
                                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                <button onClick={() => likeComment(c.id)} className={`flex items-center gap-1 transition ${c.is_liked_by_me ? 'text-blue-600' : 'hover:text-red-500'}`}><ThumbsUp size={10} className={c.is_liked_by_me ? 'fill-blue-600' : ''}/> {c.likes > 0 ? c.likes : 'Like'}</button>
                                <button onClick={() => setReplyTo({id: c.id, username: c.username})} className="hover:text-blue-600">Reply</button>
                            </div>
                        </div>
                    </div>
                    {hasReplies && (<div className={`pl-12 mt-1`}><button onClick={() => toggleReplies(c.id)} className="text-xs text-stone-400 font-bold flex items-center gap-1 hover:text-stone-600 transition"><div className="w-6 h-[1px] bg-stone-200"></div>{isExpanded ? "Hide replies" : `View replies`}{isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}</button></div>)}
                    {isExpanded && <div className="pl-8 border-l-2 border-stone-100 ml-4">{renderCommentTree(c.id, depth + 1)}</div>}
                </div>
            );
        });
    };

    const filteredStories = stories.filter(s => {
        const dbType = (s.media_type || 'image').toLowerCase();
        const targetType = activeTab === 'posts' ? 'image' : 'video';
        return dbType === targetType;
    });

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-6 font-sans pt-24">
            
            {/* COMMENT MODAL */}
            {showComments && (
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end md:items-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl relative animate-fade-in">
                        <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-3xl z-10"><h3 className="font-bold">Comments ({comments.length})</h3><button onClick={() => setShowComments(null)} className="p-1 hover:bg-stone-100 rounded-full"><X size={20}/></button></div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {comments.length === 0 && <div className="h-full flex flex-col items-center justify-center text-stone-400"><MessageCircle size={40} className="mb-2 opacity-20"/><p className="text-sm">No comments yet.</p></div>}
                            {renderCommentTree(null)}
                        </div>
                        <div className="p-3 border-t bg-white rounded-b-3xl">
                            {replyTo && (<div className="text-xs text-stone-500 mb-2 flex justify-between bg-orange-50 p-2 rounded-lg border border-orange-100"><span className="flex items-center gap-1"><CornerDownRight size={12}/> Replying to <b className="text-orange-600">@{replyTo.username}</b></span><button onClick={() => setReplyTo(null)} className="hover:text-red-500"><X size={12}/></button></div>)}
                            <div className="flex gap-2 items-center"><img src={getImageUrl(user?.profile_pic)} className="w-8 h-8 rounded-full object-cover bg-stone-100"/><div className="flex-1 relative"><input type="text" placeholder={replyTo ? "Write a reply..." : "Add a comment..."} value={newComment} onChange={e => setNewComment(e.target.value)} className="w-full pl-4 pr-10 py-2.5 bg-stone-100 rounded-full outline-none text-sm focus:ring-2 focus:ring-orange-200 transition" onKeyPress={(e) => e.key === 'Enter' && postComment()} autoFocus /><button onClick={postComment} disabled={!newComment.trim()} className="absolute right-1 top-1 text-white bg-stone-900 p-1.5 rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"><Send size={14}/></button></div></div>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOAD MODAL */}
            {showModal && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative"><h3 className="font-bold text-xl mb-6">Create New Story</h3><div className="mb-6"><label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-stone-300 rounded-2xl cursor-pointer hover:bg-stone-50 transition overflow-hidden bg-stone-100">{previewUrl ? (fileType === 'video' ? <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop /> : <img src={previewUrl} className="w-full h-full object-contain"/>) : <div className="text-center text-stone-500"><Camera size={32} className="mx-auto mb-2"/><span className="text-sm font-bold">Upload Photo or Video</span></div>}<input type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" /></label></div><textarea placeholder="Write a caption..." className="w-full p-4 bg-stone-50 rounded-xl border-none outline-none mb-6 h-24" onChange={e => setCaption(e.target.value)}></textarea><div className="flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border font-bold">Cancel</button><button onClick={handleUpload} className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold">Post</button></div></div></div>)}

            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div><h1 className="text-3xl font-serif font-bold text-stone-900">Style Stories</h1><p className="text-stone-500">Discover trends & outfits.</p></div>
                    <div className="bg-white p-1 rounded-full border shadow-sm flex"><button onClick={() => setActiveTab('posts')} className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition ${activeTab === 'posts' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}><ImageIcon size={18}/> Posts</button><button onClick={() => setActiveTab('shorts')} className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition ${activeTab === 'shorts' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}><Video size={18}/> Shorts</button></div>
                    {user && <button onClick={() => setShowModal(true)} className="bg-orange-600 text-white px-5 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-orange-700 transition shadow-lg"><Plus size={20}/> Create</button>}
                </div>

                <div className={activeTab === 'shorts' ? "flex flex-wrap justify-center gap-6" : "space-y-8"}>
                    {filteredStories.length === 0 && <p className="col-span-full text-center text-stone-400 py-10">No content here yet. Post something!</p>}

                    {filteredStories.map(story => (
                        <div key={story.id} className={`bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden mx-auto w-full ${activeTab === 'shorts' ? 'w-[320px] aspect-[9/16] relative group shadow-lg' : 'w-full'}`}>
                            
                            {/* HEADER */}
                            {activeTab === 'posts' && (
                                <div className="p-4 flex items-center justify-between border-b border-stone-50">
                                    <Link to={`/seller/${story.user_id}`} className="flex items-center gap-3 hover:opacity-75 transition"><div className="w-10 h-10 rounded-full overflow-hidden bg-stone-200"><img src={getImageUrl(story.profile_pic)} className="w-full h-full object-cover"/></div><span className="font-bold text-stone-900">{story.username}</span></Link>
                                    <button onClick={() => handleReport(story.id)} className="text-stone-400 hover:text-red-500 flex items-center gap-1 text-xs"><Flag size={14}/> Report</button>
                                </div>
                            )}

                            {/* MEDIA */}
                            {story.media_type === 'video' ? (
                                <div className="relative w-full h-full bg-black">
                                    <video src={getImageUrl(story.image_url)} className="w-full h-full object-cover" loop muted={isMuted} autoPlay={activeTab === 'shorts'} controls={activeTab === 'posts'} />
                                    {activeTab === 'shorts' && (
                                        <>
                                            <div className="absolute top-3 right-3 flex flex-col gap-3 z-20">
                                                <button onClick={(e) => { e.stopPropagation(); handleReport(story.id); }} className="bg-black/40 text-white p-2.5 rounded-full hover:bg-red-600 transition backdrop-blur-sm"><Flag size={18}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="bg-black/40 text-white p-2.5 rounded-full backdrop-blur-sm">{isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}</button>
                                            </div>
                                            <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white">
                                                <Link to={`/seller/${story.user_id}`} className="flex items-center gap-2 mb-2 hover:underline"><div className="w-6 h-6 rounded-full overflow-hidden border border-white"><img src={getImageUrl(story.profile_pic)} className="w-full h-full object-cover"/></div><p className="font-bold text-sm shadow-black drop-shadow-md">{story.username}</p></Link><p className="text-xs opacity-90 line-clamp-2 leading-relaxed">{story.caption}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (<img src={getImageUrl(story.image_url)} className="w-full h-[500px] object-cover"/>)}

                            {/* FOOTER */}
                            <div className={activeTab === 'shorts' ? "absolute bottom-20 right-2 flex flex-col gap-4 text-white z-20" : "p-5"}>
                                <div className={`flex ${activeTab === 'shorts' ? 'flex-col items-center' : 'items-center gap-4 mb-3'}`}>
                                    <button onClick={() => handleLike(story.id)} className={`flex items-center gap-1 transition group hover:scale-110 ${story.is_liked_by_me ? 'text-red-500' : (activeTab === 'shorts' ? 'text-white' : 'text-stone-600')}`}>
                                        <Heart size={24} className={`${activeTab === 'shorts' ? 'drop-shadow-lg' : ''} ${story.is_liked_by_me ? 'fill-red-500' : ''}`} /> 
                                        <span className="text-sm font-bold">{story.likes}</span>
                                    </button>
                                    <button onClick={(e) => {e.stopPropagation(); openComments(story.id)}} className={`flex items-center gap-1 ${activeTab === 'shorts' ? 'text-white hover:text-blue-300' : 'hover:text-blue-500'} ${activeTab === 'shorts' ? 'mt-4' : ''}`}><MessageCircle size={24} className={activeTab === 'shorts' ? 'drop-shadow-lg' : ''} /> <span className="text-sm font-bold">{story.comment_count || 0}</span></button>
                                </div>
                                {activeTab === 'posts' && <p className="text-stone-800 leading-relaxed"><span className="font-bold mr-2">{story.username}</span>{story.caption}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default Stories;