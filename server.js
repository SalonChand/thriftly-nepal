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

const db = mysql.createPool({
    host: 'localhost', user: 'root', password: '', database: 'thrift_store_db',
    waitForConnections: true, connectionLimit: 10
});
db.getConnection((err) => { if(err) console.log("❌ DB Error"); else console.log('✅ MySQL Connected'); });

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));
const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, 'uploads/'), filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname) });
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

io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => socket.join(roomId));
    socket.on('send_message', (data) => {
        const sql = "INSERT INTO messages (sender_id, receiver_id, product_id, message) VALUES (?)";
        db.query(sql, [[data.sender_id, data.receiver_id, data.product_id, data.message]], (err) => {
            if(!err) {
                socket.to(data.room).emit('receive_message', data);
                db.query("SELECT username FROM users WHERE id = ?", [data.sender_id], (err2, userRes) => {
                    createNotification(data.receiver_id, 'message', `New message from ${userRes[0]?.username || "User"}`);
                });
            }
        });
    });
});

// --- 📊 ANALYTICS ROUTES ---

// 1. Get Seller Stats
app.get('/my-stats/:id', verifyUser, (req, res) => {
    const userId = req.params.id;
    
    // Query 1: Total Earnings & Sold Count
    const q1 = `SELECT SUM(p.price) as total_earnings, COUNT(o.id) as items_sold 
                FROM orders o JOIN products p ON o.product_id = p.id WHERE o.seller_id = ?`;
    
    // Query 2: Total Views & Active Count
    const q2 = `SELECT SUM(views) as total_views, COUNT(id) as total_listings 
                FROM products WHERE seller_id = ?`;

    // Query 3: Sales over time (Last 5 sales)
    const q3 = `SELECT p.title, p.price, o.order_date 
                FROM orders o JOIN products p ON o.product_id = p.id 
                WHERE o.seller_id = ? ORDER BY o.order_date DESC LIMIT 5`;

    db.query(q1, [userId], (err, earningsData) => {
        db.query(q2, [userId], (err2, viewsData) => {
            db.query(q3, [userId], (err3, recentSales) => {
                res.json({
                    earnings: earningsData[0].total_earnings || 0,
                    sold: earningsData[0].items_sold || 0,
                    views: viewsData[0].total_views || 0,
                    active: viewsData[0].total_listings || 0,
                    recent: recentSales
                });
            });
        });
    });
});

// --- CORE ROUTES ---

// Product Details (Now Increments Views) 👁️
app.get('/products/:id', (req, res) => {
    // 1. Increment View Count
    db.query("UPDATE products SET views = views + 1 WHERE id = ?", [req.params.id]);

    // 2. Fetch Data
    const sql = "SELECT products.*, users.phone as seller_phone, users.username as seller_name FROM products JOIN users ON products.seller_id = users.id WHERE products.id = ?";
    db.query(sql, [req.params.id], (err, data) => {
        if(err || data.length===0) return res.json({});
        const product = data[0];
        db.query("SELECT image_url FROM product_images WHERE product_id = ?", [req.params.id], (err2, imgData) => {
            const images = imgData.map(img => img.image_url);
            if(!images.includes(product.image_url)) images.unshift(product.image_url);
            product.images = images;
            res.json(product);
        });
    });
});

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
app.post('/verify', (req, res) => {
    db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [req.body.email, req.body.otp], (err, data) => {
        if(data.length > 0) db.query("UPDATE users SET is_verified = 1 WHERE email = ?", [req.body.email], () => res.json({Status: "Success"}));
        else res.json({Error: "Invalid Code"});
    });
});
app.post('/login', (req, res) => {
    db.query("SELECT * FROM users WHERE email = ?", [req.body.email], (err, data) => {
        if(data.length > 0) {
            bcrypt.compare(req.body.password.toString(), data[0].password, (err2, response) => {
                if(response) {
                    const { id, username, role, profile_pic, bio } = data[0];
                    const token = jwt.sign({ username, id, role }, SECRET_KEY, { expiresIn: '1d' });
                    res.cookie('token', token);
                    res.json({Status: "Success", user: { id, username, role, profile_pic, bio }, token});
                } else res.json({Error: "Wrong Password"});
            });
        } else res.json({Error: "User not found"});
    });
});
app.post('/products', verifyUser, upload.array('images', 5), (req, res) => {
    const { title, description, price, category, size, condition, location } = req.body;
    const mainImage = (req.files && req.files.length > 0) ? req.files[0].filename : null;
    db.query("INSERT INTO products (`title`, `description`, `price`, `category`, `image_url`, `seller_id`, `size`, `item_condition`, `location`) VALUES (?)", [[title, description, price, category, mainImage, req.user_id, size, condition, location]], (err, result) => {
        const productId = result.insertId;
        if(req.files.length > 0) {
            const vals = req.files.map(f => [productId, f.filename]);
            db.query("INSERT INTO product_images (product_id, image_url) VALUES ?", [vals]);
        }
        res.json({Status: "Success"});
    });
});
app.get('/products', (req, res) => { db.query("SELECT * FROM products WHERE is_sold = 0 ORDER BY is_featured DESC, created_at DESC", (err, data) => res.json(data)); });
app.get('/all-products', (req, res) => { db.query("SELECT * FROM products ORDER BY created_at DESC", (err, data) => res.json(data)); });
app.post('/buy/:id', verifyUser, (req, res) => {
    db.query("UPDATE products SET is_sold = 1 WHERE id = ?", [req.params.id], () => {
        db.query("INSERT INTO orders (`product_id`, `buyer_id`, `seller_id`) VALUES (?)", [[req.params.id, req.user_id, req.body.seller_id]], () => {
            // Notifications logic... (Simplified for space)
            createNotification(req.body.seller_id, 'sale', `You sold an item!`);
            res.json({Status: "Success"});
        });
    });
});
app.post('/offers', verifyUser, (req, res) => {
    if(req.user_id == req.body.seller_id) return res.json({Error: "Own item"});
    db.query("INSERT INTO offers (`product_id`, `buyer_id`, `seller_id`, `offer_amount`) VALUES (?)", [[req.body.product_id, req.user_id, req.body.seller_id, req.body.offer_amount]], () => {
        createNotification(req.body.seller_id, 'offer', `New offer: Rs. ${req.body.offer_amount}`);
        res.json({Status: "Success"});
    });
});
app.put('/offers/:offerId', verifyUser, (req, res) => {
    db.query("UPDATE offers SET status = ? WHERE id = ?", [req.body.status, req.params.offerId], () => {
        // Find buyer and notify (Simplified)
        res.json({Status: "Success"});
    });
});
app.get('/my-offers/:id', verifyUser, (req, res) => {
    db.query(`SELECT offers.*, products.title, products.image_url, users.username as buyer_name FROM offers JOIN products ON offers.product_id = products.id JOIN users ON offers.buyer_id = users.id WHERE offers.seller_id = ? AND products.is_sold = 0 ORDER BY created_at DESC`, [req.params.id], (err, rec) => {
        db.query(`SELECT offers.*, products.title, products.image_url, users.username as seller_name FROM offers JOIN products ON offers.product_id = products.id JOIN users ON offers.seller_id = users.id WHERE offers.buyer_id = ? ORDER BY created_at DESC`, [req.params.id], (err2, sent) => res.json({ received: rec, sent: sent }));
    });
});
app.post('/boost/:id', verifyUser, (req, res) => {
    const exp = new Date(); exp.setDate(exp.getDate() + 3);
    db.query("UPDATE products SET is_featured = 1, featured_expires_at = ? WHERE id = ?", [exp, req.params.id], () => res.json({Status: "Success"}));
});
app.delete('/products/:id', (req, res) => {
    db.query("DELETE FROM product_images WHERE product_id = ?", [req.params.id], () => {
        db.query("DELETE FROM products WHERE id = ?", [req.params.id], () => res.json({ Status: "Success" }));
    });
});
app.get('/users', (req, res) => db.query("SELECT id, username, email, role, is_verified FROM users", (err, data) => res.json(data)));
app.get('/admin/orders', (req, res) => db.query("SELECT orders.id, orders.order_date, products.title, products.price, products.image_url, buyer.username AS buyer_name, seller.username AS seller_name, seller.phone AS seller_phone FROM orders JOIN products ON orders.product_id = products.id JOIN users AS buyer ON orders.buyer_id = buyer.id JOIN users AS seller ON orders.seller_id = seller.id ORDER BY orders.order_date DESC", (err, data) => res.json(data)));
app.delete('/users/:id', (req, res) => db.query("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ Status: "Success" })));
app.get('/my-listings/:id', (req, res) => db.query("SELECT * FROM products WHERE seller_id = ?", [req.params.id], (err, data) => res.json(data)));
app.get('/my-orders/:id', (req, res) => db.query("SELECT orders.id, orders.status, orders.order_date, orders.seller_id, products.title, products.price, products.image_url, users.username as seller_name FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.seller_id = users.id WHERE orders.buyer_id = ?", [req.params.id], (err, data) => res.json(data)));
app.get('/my-sales/:id', (req, res) => db.query("SELECT orders.id as order_id, orders.status, orders.order_date, products.title, products.image_url, products.price, users.username as buyer_name, users.phone as buyer_phone FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.buyer_id = users.id WHERE orders.seller_id = ?", [req.params.id], (err, data) => res.json(data)));
app.post('/wishlist/toggle', verifyUser, (req, res) => {
    db.query("SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, req.body.product_id], (err, data) => {
        if(data.length > 0) db.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, req.body.product_id], () => res.json({Status: "Removed"}));
        else db.query("INSERT INTO wishlist (`user_id`, `product_id`) VALUES (?)", [[req.user_id, req.body.product_id]], () => res.json({Status: "Added"}));
    });
});
app.get('/wishlist/:userId', (req, res) => db.query("SELECT products.*, wishlist.id as wishlist_id FROM wishlist JOIN products ON wishlist.product_id = products.id WHERE wishlist.user_id = ?", [req.params.userId], (err, data) => res.json(data)));
app.put('/user/:id', upload.single('profile_pic'), (req, res) => {
    let sql = "UPDATE users SET username = ?, bio = ?"; let p = [req.body.username, req.body.bio];
    if(req.file) { sql += ", profile_pic = ?"; p.push(req.file.filename); }
    sql += " WHERE id = ?"; p.push(req.params.id);
    db.query(sql, p, () => { db.query("SELECT id, username, email, bio, profile_pic, role FROM users WHERE id = ?", [req.params.id], (err, data) => res.json({Status: "Success", user: data[0]})); });
});
app.post('/reviews', verifyUser, (req, res) => {
    if(Number(req.body.seller_id) === Number(req.user_id)) return res.json({Error: "No self-review"});
    db.query("INSERT INTO reviews (`reviewer_id`, `seller_id`, `rating`, `comment`) VALUES (?)", [[req.user_id, req.body.seller_id, req.body.rating, req.body.comment]], () => res.json({Status: "Success"}));
});
app.get('/reviews/:seller_id', (req, res) => db.query("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE seller_id = ?", [req.params.seller_id], (err, data) => res.json({ avg: data[0].avg || 0, count: data[0].count || 0 })));
app.get('/messages', verifyUser, (req, res) => {
    const { sender_id, receiver_id, product_id } = req.query;
    db.query(`SELECT * FROM messages WHERE product_id = ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) ORDER BY created_at ASC`, [product_id, sender_id, receiver_id, receiver_id, sender_id], (err, data) => res.json(data || []));
});
app.get('/my-conversations/:id', verifyUser, (req, res) => {
    const sql = `SELECT p.id AS product_id, p.title, p.image_url, u.id AS other_user_id, u.username AS other_user_name, MAX(m.created_at) as last_msg_time FROM messages m JOIN products p ON m.product_id = p.id JOIN users u ON u.id = (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) WHERE m.sender_id = ? OR m.receiver_id = ? GROUP BY p.id, u.id ORDER BY last_msg_time DESC`;
    db.query(sql, [req.params.id, req.params.id, req.params.id], (err, data) => res.json(data || []));
});
app.post('/contact', (req, res) => { transporter.sendMail({ from: 'ThriftLy', to: process.env.EMAIL_USER, subject: `Support: ${req.body.name}`, text: req.body.message }); res.json({ Status: "Success" }); });
app.post('/forgot-password', (req, res) => {
    const otp = Math.floor(1000 + Math.random() * 9000);
    db.query("UPDATE users SET otp_code = ? WHERE email = ?", [otp, req.body.email], (err, result) => {
        if(err || result.affectedRows === 0) return res.json({Error: "Email not found"});
        transporter.sendMail({ from: 'ThriftLy', to: req.body.email, subject: 'Reset Password', text: `OTP: ${otp}` }); return res.json({ Status: "Success" });
    });
});
app.post('/reset-password', (req, res) => {
    db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [req.body.email, req.body.otp], (err, data) => {
        if(data.length === 0) return res.json({Error: "Invalid OTP"});
        bcrypt.hash(req.body.newPassword.toString(), 10, (err, hash) => { db.query("UPDATE users SET password = ?, otp_code = NULL WHERE email = ?", [hash, req.body.email], () => res.json({ Status: "Success" })); });
    });
});
app.post('/unfollow', verifyUser, (req, res) => { db.query("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [req.user_id, req.body.following_id], () => res.json({Status: "Success"})); });
app.get('/check-follow/:id', verifyUser, (req, res) => { db.query("SELECT * FROM follows WHERE follower_id = ? AND following_id = ?", [req.user_id, req.params.id], (err, data) => res.json({ isFollowing: data.length > 0 })); });
app.get('/following-products', verifyUser, (req, res) => {
    db.query(`SELECT p.* FROM products p JOIN follows f ON p.seller_id = f.following_id WHERE f.follower_id = ? AND p.is_sold = 0 ORDER BY p.created_at DESC`, [req.user_id], (err, data) => res.json(data));
});
app.get('/notifications', verifyUser, (req, res) => db.query("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [req.user_id], (err, data) => res.json(data)));
app.put('/notifications/read', verifyUser, (req, res) => db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user_id], () => res.json({Status: "Success"})));
app.put('/order-status/:id', verifyUser, (req, res) => db.query("UPDATE orders SET status = ? WHERE id = ?", [req.body.status, req.params.id], () => res.json({Status: "Success"})));

server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));