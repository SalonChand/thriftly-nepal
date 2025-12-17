require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 5000;
const SECRET_KEY = "supersecretkey"; 

app.use(cors({ 
    origin: ["http://localhost:5173", "http://localhost:4173"], 
    methods: ["POST", "GET", "PUT", "DELETE"], 
    credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// 👇 CHANGED TO 'createConnection' (Simpler & More Reliable for Localhost)
const db = mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', // ⚠️ TYPE YOUR PASSWORD HERE (Keep empty '' if you don't have one)
    database: 'thrift_store_db'
});

// Connect immediately
db.connect((err) => { 
    if(err) {
        console.log("❌ DB Error Code:", err.code);
        console.log("❌ DB Error Message:", err.message);
    } else {
        console.log('✅ MySQL Connected Successfully'); 
    }
});

// UPLOADS
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.json({ Error: "Not authenticated" });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.json({ Error: "Invalid Token" });
        req.user_id = decoded.id; req.username = decoded.username; next();
    });
};

const createNotification = (userId, type, message) => {
    db.query("INSERT INTO notifications (user_id, type, message) VALUES (?)", [[userId, type, message]], (err) => {
        if(!err) io.emit(`notification_${userId}`, { type, message });
    });
};

// --- ROUTES ---

// STORIES (FIXED)
app.get('/stories', (req, res) => {
    // Check if user is logged in to see "is_liked_by_me", otherwise userId is 0
    let userId = 0;
    const token = req.cookies.token;
    if(token) {
        try { userId = jwt.verify(token, SECRET_KEY).id; } catch(e) {}
    }

    const sql = `
        SELECT s.*, 
               u.username, u.profile_pic, 
               (SELECT COUNT(*) FROM story_comments WHERE story_id = s.id) as comment_count,
               (SELECT COUNT(*) FROM story_likes WHERE story_id = s.id AND user_id = ?) as is_liked_by_me
        FROM stories s 
        LEFT JOIN users u ON s.user_id = u.id 
        ORDER BY s.created_at DESC
    `;
    db.query(sql, [userId], (err, data) => {
        if(err) { console.log(err); return res.json([]); }
        return res.json(data);
    });
});

app.put('/stories/like/:id', verifyUser, (req, res) => {
    const storyId = req.params.id;
    const userId = req.user_id;

    db.query("SELECT * FROM story_likes WHERE user_id = ? AND story_id = ?", [userId, storyId], (err, data) => {
        if (data.length > 0) {
            db.query("DELETE FROM story_likes WHERE user_id = ? AND story_id = ?", [userId, storyId]);
            db.query("UPDATE stories SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [storyId], () => {
                db.query("SELECT likes FROM stories WHERE id = ?", [storyId], (e, r) => io.emit('story_like_update', { storyId: parseInt(storyId), likes: r[0].likes }));
                res.json({ Status: "Unliked" });
            });
        } else {
            db.query("INSERT INTO story_likes (user_id, story_id) VALUES (?)", [[userId, storyId]]);
            db.query("UPDATE stories SET likes = likes + 1 WHERE id = ?", [storyId], () => {
                db.query("SELECT likes FROM stories WHERE id = ?", [storyId], (e, r) => io.emit('story_like_update', { storyId: parseInt(storyId), likes: r[0].likes }));
                res.json({ Status: "Liked" });
            });
        }
    });
});

app.post('/stories', verifyUser, upload.single('media'), (req, res) => {
    if (!req.file) return res.json({ Error: "File required" });
    const mime = req.file.mimetype;
    let type = 'image'; if (mime.includes('video')) type = 'video';
    db.query("INSERT INTO stories (user_id, image_url, caption, media_type) VALUES (?)", [[req.user_id, req.file.filename, req.body.caption, type]], () => res.json({ Status: "Success" }));
});

app.get('/stories/:id/comments', (req, res) => {
    const currentUserId = req.query.userId || 0;
    const sql = `SELECT c.*, u.username, u.profile_pic, (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ?) as is_liked_by_me FROM story_comments c JOIN users u ON c.user_id = u.id WHERE c.story_id = ? ORDER BY c.created_at ASC`;
    db.query(sql, [currentUserId, req.params.id], (err, data) => res.json(data || []));
});

app.post('/stories/:id/comment', verifyUser, (req, res) => {
    const { comment, parent_id } = req.body;
    db.query("INSERT INTO story_comments (story_id, user_id, comment, parent_id) VALUES (?)", [[req.params.id, req.user_id, comment, parent_id || null]], (err, result) => {
        if(err) return res.json({Error: "DB Error"});
        const newCommentId = result.insertId;
        const sqlFetch = `SELECT c.*, u.username, u.profile_pic, 0 as is_liked_by_me, 0 as likes FROM story_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`;
        db.query(sqlFetch, [newCommentId], (e, d) => {
            io.emit('new_comment', { storyId: parseInt(req.params.id), comment: d[0] });
            db.query("SELECT user_id FROM stories WHERE id = ?", [req.params.id], (err, result) => {
                if(result.length > 0 && result[0].user_id !== req.user_id) createNotification(result[0].user_id, 'message', `${req.username} commented on your story.`);
            });
            res.json({ Status: "Success" });
        });
    });
});

app.post('/comments/like/:id', verifyUser, (req, res) => {
    const commentId = req.params.id; const userId = req.user_id;
    db.query("SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?", [userId, commentId], (err, data) => {
        if (data.length > 0) {
            db.query("DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?", [userId, commentId]);
            db.query("UPDATE story_comments SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [commentId], () => {
                db.query("SELECT likes FROM story_comments WHERE id = ?", [commentId], (e, r) => io.emit('comment_like_update', { commentId: parseInt(commentId), likes: r[0].likes }));
                res.json({ Status: "Unliked" });
            });
        } else {
            db.query("INSERT INTO comment_likes (user_id, comment_id) VALUES (?)", [[userId, commentId]]);
            db.query("UPDATE story_comments SET likes = likes + 1 WHERE id = ?", [commentId], () => {
                db.query("SELECT likes FROM story_comments WHERE id = ?", [commentId], (e, r) => io.emit('comment_like_update', { commentId: parseInt(commentId), likes: r[0].likes }));
                res.json({ Status: "Liked" });
            });
        }
    });
});

app.post('/stories/:id/report', verifyUser, (req, res) => {
    db.query("INSERT INTO story_reports (reporter_id, story_id, reason) VALUES (?)", [[req.user_id, req.params.id, req.body.reason]], () => {
        createNotification(1, 'admin', `New Story Report`);
        return res.json({ Status: "Success" });
    });
});

// CORE ROUTES
app.post('/register', (req, res) => {
    const otp = Math.floor(1000 + Math.random() * 9000);
    bcrypt.hash(req.body.password.toString(), 10, (err, hash) => {
        db.query("INSERT INTO users (`username`, `email`, `password`, `phone`, `otp_code`, `is_verified`) VALUES (?)", [[req.body.username, req.body.email, hash, req.body.phone, otp, 0]], (err2) => {
            if(err2) return res.json({Error: "User exists"});
            transporter.sendMail({ from: 'ThriftLy', to: req.body.email, subject: 'Verify', text: `OTP: ${otp}` }).catch(console.log);
            res.json({Status: "Success"});
        });
    });
});
app.post('/verify', (req, res) => { db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [req.body.email, req.body.otp], (err, data) => { if(data.length > 0) db.query("UPDATE users SET is_verified = 1 WHERE email = ?", [req.body.email], () => res.json({Status: "Success"})); else res.json({Error: "Invalid Code"}); }); });
app.post('/login', (req, res) => { db.query("SELECT * FROM users WHERE email = ?", [req.body.email], (err, data) => { if(data.length > 0) { bcrypt.compare(req.body.password.toString(), data[0].password, (err2, response) => { if(response) { const token = jwt.sign({ username: data[0].username, id: data[0].id, role: data[0].role }, SECRET_KEY, { expiresIn: '1d' }); res.cookie('token', token); res.json({Status: "Success", user: data[0], token}); } else res.json({Error: "Wrong Password"}); }); } else res.json({Error: "User not found"}); }); });
app.post('/products', verifyUser, upload.array('images', 5), (req, res) => { const { title, description, price, category, size, condition, location } = req.body; const mainImage = (req.files && req.files.length > 0) ? req.files[0].filename : null; db.query("INSERT INTO products (`title`, `description`, `price`, `category`, `image_url`, `seller_id`, `size`, `item_condition`, `location`) VALUES (?)", [[title, description, price, category, mainImage, req.user_id, size, condition, location]], (err, result) => { const productId = result.insertId; if(req.files.length > 0) { const vals = req.files.map(f => [productId, f.filename]); db.query("INSERT INTO product_images (product_id, image_url) VALUES ?", [vals]); } res.json({Status: "Success"}); }); });
app.get('/products', (req, res) => { db.query("SELECT * FROM products WHERE is_sold = 0 ORDER BY is_featured DESC, created_at DESC", (err, data) => res.json(data || [])); });
app.get('/all-products', (req, res) => { db.query("SELECT * FROM products ORDER BY created_at DESC", (err, data) => res.json(data || [])); });
app.get('/products/:id', (req, res) => { db.query("SELECT products.*, users.phone as seller_phone, users.username as seller_name FROM products JOIN users ON products.seller_id = users.id WHERE products.id = ?", [req.params.id], (err, data) => { if(err || data.length===0) return res.json({}); const product = data[0]; db.query("UPDATE products SET views = views + 1 WHERE id = ?", [req.params.id]); db.query("SELECT image_url FROM product_images WHERE product_id = ?", [req.params.id], (err2, imgData) => { const images = imgData.map(img => img.image_url); if(!images.includes(product.image_url)) images.unshift(product.image_url); product.images = images; res.json(product); }); }); });
app.post('/buy/:id', verifyUser, (req, res) => { db.query("UPDATE products SET is_sold = 1 WHERE id = ?", [req.params.id], () => { db.query("INSERT INTO orders (`product_id`, `buyer_id`, `seller_id`) VALUES (?)", [[req.params.id, req.user_id, req.body.seller_id]], () => { createNotification(req.body.seller_id, 'sale', `You sold an item!`); res.json({Status: "Success"}); }); }); });
app.post('/offers', verifyUser, (req, res) => { if(req.user_id == req.body.seller_id) return res.json({Error: "Own item"}); db.query("INSERT INTO offers (`product_id`, `buyer_id`, `seller_id`, `offer_amount`) VALUES (?)", [[req.body.product_id, req.user_id, req.body.seller_id, req.body.offer_amount]], () => { createNotification(req.body.seller_id, 'offer', 'New offer received'); res.json({Status: "Success"}); }); });
app.put('/offers/:offerId', verifyUser, (req, res) => { db.query("UPDATE offers SET status = ? WHERE id = ?", [req.body.status, req.params.offerId], () => { db.query("SELECT buyer_id FROM offers WHERE id = ?", [req.params.offerId], (e, d) => { if(d.length > 0) createNotification(d[0].buyer_id, 'offer', `Your offer was ${req.body.status}`); }); res.json({Status: "Success"}); }); });
app.get('/my-offers/:id', verifyUser, (req, res) => { db.query(`SELECT offers.*, products.title, products.image_url, users.username as buyer_name FROM offers JOIN products ON offers.product_id = products.id JOIN users ON offers.buyer_id = users.id WHERE offers.seller_id = ? ORDER BY created_at DESC`, [req.params.id], (err, rec) => { db.query(`SELECT offers.*, products.title, products.image_url, users.username as seller_name FROM offers JOIN products ON offers.product_id = products.id JOIN users ON offers.seller_id = users.id WHERE offers.buyer_id = ? ORDER BY created_at DESC`, [req.params.id], (err2, sent) => res.json({ received: rec || [], sent: sent || [] })); }); });
app.post('/boost/:id', verifyUser, (req, res) => { const exp = new Date(); exp.setDate(exp.getDate() + 3); db.query("UPDATE products SET is_featured = 1, featured_expires_at = ? WHERE id = ?", [exp, req.params.id], () => res.json({Status: "Success"})); });
app.delete('/products/:id', (req, res) => { db.query("DELETE FROM product_images WHERE product_id = ?", [req.params.id], () => { db.query("DELETE FROM products WHERE id = ?", [req.params.id], () => res.json({ Status: "Success" })); }); });
app.get('/users', (req, res) => db.query("SELECT id, username, email, role, is_verified FROM users", (err, data) => res.json(data || [])));
app.get('/admin/orders', (req, res) => db.query("SELECT orders.id, orders.order_date, products.title, products.price, products.image_url, buyer.username AS buyer_name, seller.username AS seller_name, seller.phone AS seller_phone FROM orders JOIN products ON orders.product_id = products.id JOIN users AS buyer ON orders.buyer_id = buyer.id JOIN users AS seller ON orders.seller_id = seller.id ORDER BY orders.order_date DESC", (err, data) => res.json(data || [])));
app.delete('/users/:id', (req, res) => db.query("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ Status: "Success" })));
app.get('/my-listings/:id', (req, res) => db.query("SELECT * FROM products WHERE seller_id = ?", [req.params.id], (err, data) => res.json(data || [])));
app.get('/my-orders/:id', (req, res) => db.query("SELECT orders.id, orders.status, orders.order_date, orders.seller_id, products.title, products.price, products.image_url, users.username as seller_name FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.seller_id = users.id WHERE orders.buyer_id = ?", [req.params.id], (err, data) => res.json(data || [])));
app.get('/my-sales/:id', (req, res) => db.query("SELECT orders.id as order_id, orders.status, orders.order_date, products.title, products.image_url, products.price, users.username as buyer_name, users.phone as buyer_phone FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.buyer_id = users.id WHERE orders.seller_id = ?", [req.params.id], (err, data) => res.json(data || [])));
app.post('/wishlist/toggle', verifyUser, (req, res) => { db.query("SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, req.body.product_id], (err, data) => { if(data.length > 0) db.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, req.body.product_id], () => res.json({Status: "Removed"})); else db.query("INSERT INTO wishlist (`user_id`, `product_id`) VALUES (?)", [[req.user_id, req.body.product_id]], () => res.json({Status: "Added"})); }); });
app.get('/wishlist/:userId', (req, res) => db.query("SELECT products.*, wishlist.id as wishlist_id FROM wishlist JOIN products ON wishlist.product_id = products.id WHERE wishlist.user_id = ?", [req.params.userId], (err, data) => res.json(data || [])));
app.put('/user/:id', upload.single('profile_pic'), (req, res) => { let sql = "UPDATE users SET username = ?, bio = ?"; let p = [req.body.username, req.body.bio]; if(req.file) { sql += ", profile_pic = ?"; p.push(req.file.filename); } sql += " WHERE id = ?"; p.push(req.params.id); db.query(sql, p, () => { db.query("SELECT id, username, email, bio, profile_pic, role FROM users WHERE id = ?", [req.params.id], (err, data) => res.json({Status: "Success", user: data[0]})); }); });
app.post('/reviews', verifyUser, (req, res) => { if(Number(req.body.seller_id) === Number(req.user_id)) return res.json({Error: "No self-review"}); db.query("INSERT INTO reviews (`reviewer_id`, `seller_id`, `rating`, `comment`) VALUES (?)", [[req.user_id, req.body.seller_id, req.body.rating, req.body.comment]], () => res.json({Status: "Success"})); });
app.get('/reviews/:seller_id', (req, res) => db.query("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE seller_id = ?", [req.params.seller_id], (err, data) => res.json({ avg: data[0].avg || 0, count: data[0].count || 0 })));
app.get('/messages', verifyUser, (req, res) => { db.query(`SELECT * FROM messages WHERE product_id = ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) ORDER BY created_at ASC`, [req.query.product_id, req.query.sender_id, req.query.receiver_id, req.query.receiver_id, req.query.sender_id], (err, data) => res.json(data || [])); });
app.get('/my-conversations/:id', verifyUser, (req, res) => { const sql = `SELECT p.id AS product_id, p.title, p.image_url, u.id AS other_user_id, u.username AS other_user_name, MAX(m.created_at) as last_msg_time FROM messages m JOIN products p ON m.product_id = p.id JOIN users u ON u.id = (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) WHERE m.sender_id = ? OR m.receiver_id = ? GROUP BY p.id, other_user_id ORDER BY last_msg_time DESC`; db.query(sql, [req.params.id, req.params.id, req.params.id], (err, data) => res.json(data || [])); });
app.post('/contact', (req, res) => { transporter.sendMail({ from: 'ThriftLy', to: process.env.EMAIL_USER, subject: `Support: ${req.body.name}`, text: req.body.message }); res.json({ Status: "Success" }); });
app.post('/forgot-password', (req, res) => { const otp = Math.floor(1000 + Math.random() * 9000); db.query("UPDATE users SET otp_code = ? WHERE email = ?", [otp, req.body.email], (err, result) => { if(err || result.affectedRows === 0) return res.json({Error: "Email not found"}); transporter.sendMail({ from: 'ThriftLy', to: req.body.email, subject: 'Reset Password', text: `OTP: ${otp}` }); return res.json({ Status: "Success" }); }); });
app.post('/reset-password', (req, res) => { db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [req.body.email, req.body.otp], (err, data) => { if(data.length === 0) return res.json({Error: "Invalid OTP"}); bcrypt.hash(req.body.newPassword.toString(), 10, (err, hash) => { db.query("UPDATE users SET password = ?, otp_code = NULL WHERE email = ?", [hash, req.body.email], () => res.json({ Status: "Success" })); }); }); });
app.post('/unfollow', verifyUser, (req, res) => { db.query("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [req.user_id, req.body.following_id], () => res.json({Status: "Success"})); });
app.get('/check-follow/:id', verifyUser, (req, res) => { db.query("SELECT * FROM follows WHERE follower_id = ? AND following_id = ?", [req.user_id, req.params.id], (err, data) => res.json({ isFollowing: data.length > 0 })); });
app.get('/following-products', verifyUser, (req, res) => { db.query(`SELECT p.* FROM products p JOIN follows f ON p.seller_id = f.following_id WHERE f.follower_id = ? AND p.is_sold = 0 ORDER BY p.created_at DESC`, [req.user_id], (err, data) => res.json(data || [])); });
app.get('/notifications', verifyUser, (req, res) => db.query("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [req.user_id], (err, data) => res.json(data || [])));
app.put('/notifications/read', verifyUser, (req, res) => db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user_id], () => res.json({Status: "Success"})));
app.put('/order-status/:id', verifyUser, (req, res) => db.query("UPDATE orders SET status = ? WHERE id = ?", [req.body.status, req.params.id], () => res.json({Status: "Success"})));
app.post('/report', verifyUser, (req, res) => { db.query("INSERT INTO reports (reporter_id, product_id, reason) VALUES (?)", [[req.user_id, req.body.product_id, req.body.reason]], () => { createNotification(1, 'admin', `New Product Report`); return res.json({ Status: "Success" }); }); });
app.get('/admin/reports', (req, res) => { db.query(`SELECT r.id, r.reason, r.created_at, u.username AS reporter_name, u.email AS reporter_email, p.id AS product_id, p.title AS product_title, p.image_url, s.username AS seller_name FROM reports r JOIN users u ON r.reporter_id = u.id JOIN products p ON r.product_id = p.id JOIN users s ON p.seller_id = s.id ORDER BY r.created_at DESC`, (err, data) => res.json(data || [])); });
app.delete('/admin/reports/:id', (req, res) => { db.query("DELETE FROM reports WHERE id = ?", [req.params.id], () => res.json({ Status: "Success" })); });
app.get('/admin/story-reports', (req, res) => { db.query(`SELECT r.id, r.reason, r.created_at, u.username AS reporter_name, s.id AS story_id, s.image_url, s.media_type, s.caption, owner.username AS owner_name FROM story_reports r JOIN users u ON r.reporter_id = u.id JOIN stories s ON r.story_id = s.id JOIN users owner ON s.user_id = owner.id ORDER BY r.created_at DESC`, (err, data) => res.json(data || [])); });
app.delete('/admin/story-reports/:id', (req, res) => { db.query("DELETE FROM story_reports WHERE id = ?", [req.params.id], () => res.json({ Status: "Success" })); });
app.delete('/admin/story/:id', (req, res) => { db.query("DELETE FROM stories WHERE id = ?", [req.params.id], () => res.json({ Status: "Success" })); });
app.get('/my-stats/:id', verifyUser, (req, res) => { const u = req.params.id; db.query(`SELECT COALESCE(SUM(p.price), 0) as e, COUNT(o.id) as s FROM orders o JOIN products p ON o.product_id = p.id WHERE o.seller_id = ?`, [u], (err, r1) => { db.query(`SELECT COALESCE(SUM(views), 0) as v, COUNT(id) as a FROM products WHERE seller_id = ?`, [u], (err, r2) => { db.query(`SELECT p.title, p.price, o.order_date FROM orders o JOIN products p ON o.product_id = p.id WHERE o.seller_id = ? ORDER BY o.order_date DESC LIMIT 5`, [u], (err, r3) => { return res.json({ earnings: r1[0]?.e||0, sold: r1[0]?.s||0, views: r2[0]?.v||0, active: r2[0]?.a||0, recent: r3 || [] }); }); }); }); });
app.get('/public-profile/:id', (req, res) => { db.query("SELECT id, username, bio, profile_pic, created_at, role FROM users WHERE id = ?", [req.params.id], (err, userData) => { if(err || userData.length === 0) return res.json({ Error: "User not found" }); db.query("SELECT * FROM products WHERE seller_id = ? AND is_sold = 0 ORDER BY created_at DESC", [req.params.id], (err2, products) => { res.json({ user: userData[0], products: products || [] }); }); }); });

// CHAT IO (At bottom)
io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => socket.join(roomId));
    socket.on('send_message', (data) => {
        db.query("INSERT INTO messages (sender_id, receiver_id, product_id, message) VALUES (?)", [[data.sender_id, data.receiver_id, data.product_id, data.message]], (err) => {
            if(!err) {
                socket.to(data.room).emit('receive_message', data);
                db.query("SELECT username FROM users WHERE id = ?", [data.sender_id], (err2, userRes) => {
                    const senderName = userRes[0]?.username || "User";
                    createNotification(data.receiver_id, 'message', `New message from ${senderName}`);
                });
            }
        });
    });
});

server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));