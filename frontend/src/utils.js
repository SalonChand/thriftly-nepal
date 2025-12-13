export const getImageUrl = (image) => {
    if (!image) return "https://via.placeholder.com/300?text=No+Image";
    if (image.startsWith('http')) return image; // It's already a Cloudinary URL
    return `https://thriftly-nepal.onrender.com/uploads${image}`; // Fallback for old local images
};