export const getImageUrl = (image) => {
    if (!image) return "https://via.placeholder.com/300?text=No+Image";
    // If it is a full web URL, keep it. Otherwise, assume it is in local uploads.
    if (image.startsWith('http')) return image; 
    return `http://localhost:5000/uploads/${image}`; 
};