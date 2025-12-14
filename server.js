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
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey"; 

// 1. FIX CORS FOR DEPLOYMENT
// We must list the specific URLs (Localhost + Your Vercel Link)
app.use(cors({ 
    origin: [
        "http://localhost:5173", 
        "http://localhost:4173",
        "https://thriftly-nepal.vercel.app" // ⚠️ Check your Vercel URL later!
    ], 
    methods: ["POST", "GET", "PUT", "DELETE"], 
    credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

// CLOUDINARY CONFIG
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'thriftly_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const upload = multer({ storage: storage });

// EMAIL CONFIG
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// DATABASE CONNECTION POOL
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASS || '', 
    database: process.env.DB_NAME || 'thrift_store_db',
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }, 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) console.log("❌ DB Error:", err.message);
    else {
        console.log('✅ MySQL Connected');
        connection.release();
    }
});

// MIDDLEWARE
const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.json({ Error: "Not authenticated" });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.json({ Error: "Invalid Token" });
        req.user_id = decoded.id; 
        next();
    });
};

// --- AUTH ROUTES ---
app.post('/register', (req, res) => {
    const { username, email, password, phone } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000);
    const sql = "INSERT INTO users (`username`, `email`, `password`, `phone`, `otp_code`, `is_verified`) VALUES (?)";
    
    bcrypt.hash(password.toString(), 10, (err, hash) => {
        if (err) return res.json({ Error: "Error hashing" });
        
        db.query(sql, [[username, email, hash, phone, otp, 0]], (err2) => {
            if (err2) return res.json({ Error: "User exists" });
            transporter.sendMail({ from: 'ThriftLy', to: email, subject: 'Verify Code', text: `Your OTP: ${otp}` }).catch(e => console.log(e));
            return res.json({ Status: "Success" });
        });
    });
});

app.post('/verify', (req, res) => {
    db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [req.body.email, req.body.otp], (err, data) => {
        if (err) return res.json({ Error: "DB Error" });
        if (data.length > 0) {
            db.query("UPDATE users SET is_verified = 1 WHERE email = ?", [req.body.email], () => {
                return res.json({ Status: "Success" });
            });
        } else {
            return res.json({ Error: "Invalid Code" });
        }
    });
});

app.post('/login', (req, res) => {
    db.query("SELECT * FROM users WHERE email = ?", [req.body.email], (err, data) => {
        if (err) return res.json({ Error: "DB Error" });
        if (data.length > 0) {
            if (data[0].is_verified === 0) return res.json({ Error: "Not Verified" });
            
            bcrypt.compare(req.body.password.toString(), data[0].password, (err2, response) => {
                if (response) {
                    const { id, username, role, profile_pic, bio } = data[0];
                    const token = jwt.sign({ username, id, role }, SECRET_KEY, { expiresIn: '1d' });
                    
                    // 2. FIX COOKIES FOR DEPLOYMENT (Vercel -> Render)
                    res.cookie('token', token, { 
                        httpOnly: true, 
                        sameSite: 'none', 
                        secure: true // Essential for HTTPS
                    });
                    
                    return res.json({ Status: "Success", user: { id, username, role, profile_pic, bio }, token });
                } else {
                    return res.json({ Error: "Wrong Password" });
                }
            });
        } else {
            return res.json({ Error: "User not found" });
        }
    });
});

// --- PRODUCT ROUTES ---
app.post('/products', verifyUser, upload.array('images', 5), (req, res) => {
    const { title, description, price, category, size, condition } = req.body;
    const mainImage = (req.files && req.files.length > 0) ? req.files[0].path : null;

    const sql = "INSERT INTO products (`title`, `description`, `price`, `category`, `image_url`, `seller_id`, `size`, `item_condition`) VALUES (?)";
    const values = [title, description, price, category, mainImage, req.user_id, size, condition];
    
    db.query(sql, [values], (err, result) => {
        if (err) { console.log(err); return res.json({ Error: "Upload Error" }); }
        
        const productId = result.insertId;
        if (req.files && req.files.length > 0) {
            const imageValues = req.files.map(file => [productId, file.path]);
            db.query("INSERT INTO product_images (product_id, image_url) VALUES ?", [imageValues], (err2) => {
                if(err2) console.log("Extra image save error");
            });
        }
        return res.json({ Status: "Success" });
    });
});

app.get('/products', (req, res) => {
    db.query("SELECT * FROM products WHERE is_sold = 0 ORDER BY created_at DESC", (err, data) => {
        if (err) return res.json([]);
        return res.json(data);
    });
});

app.get('/all-products', (req, res) => {
    db.query("SELECT * FROM products ORDER BY created_at DESC", (err, data) => {
        if (err) return res.json([]);
        return res.json(data);
    });
});

app.get('/products/:id', (req, res) => {
    const sql = "SELECT products.*, users.phone as seller_phone, users.username as seller_name FROM products JOIN users ON products.seller_id = users.id WHERE products.id = ?";
    db.query(sql, [req.params.id], (err, productData) => {
        if (err || productData.length === 0) return res.json({});
        const product = productData[0];
        
        db.query("SELECT image_url FROM product_images WHERE product_id = ?", [req.params.id], (err2, imageData) => {
            const images = imageData ? imageData.map(img => img.image_url) : [];
            if (product.image_url && !images.includes(product.image_url)) {
                images.unshift(product.image_url);
            }
            product.images = images;
            return res.json(product);
        });
    });
});

app.post('/buy/:id', verifyUser, (req, res) => {
    const { seller_id } = req.body;
    db.query("UPDATE products SET is_sold = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.json({ Error: "Update Failed" });
        db.query("INSERT INTO orders (`product_id`, `buyer_id`, `seller_id`) VALUES (?)", [[req.params.id, req.user_id, seller_id]], () => {
            return res.json({ Status: "Success" });
        });
    });
});

app.post('/reviews', verifyUser, (req, res) => {
    const { seller_id, rating, comment } = req.body;
    if (Number(seller_id) === Number(req.user_id)) return res.json({ Error: "Self-review blocked" });
    db.query("INSERT INTO reviews (`reviewer_id`, `seller_id`, `rating`, `comment`) VALUES (?)", [[req.user_id, seller_id, rating, comment]], (err) => {
        if (err) return res.json({ Error: "DB Error" });
        return res.json({ Status: "Success" });
    });
});

app.get('/reviews/:seller_id', (req, res) => {
    db.query("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE seller_id = ?", [req.params.seller_id], (err, data) => {
        if (err) return res.json({ avg: 0, count: 0 });
        return res.json({ avg: data[0].avg_rating || 0, count: data[0].count || 0 });
    });
});

app.get('/users', (req, res) => {
    db.query("SELECT id, username, email, role, is_verified FROM users", (err, data) => res.json(data));
});

app.get('/admin/orders', (req, res) => {
    const sql = "SELECT orders.id, orders.order_date, products.title, products.price, products.image_url, buyer.username AS buyer_name, seller.username AS seller_name, seller.phone AS seller_phone FROM orders JOIN products ON orders.product_id = products.id JOIN users AS buyer ON orders.buyer_id = buyer.id JOIN users AS seller ON orders.seller_id = seller.id ORDER BY orders.order_date DESC";
    db.query(sql, (err, data) => res.json(data));
});

app.delete('/users/:id', (req, res) => {
    db.query("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ Status: "Success" }));
});

app.delete('/products/:id', (req, res) => {
    db.query("DELETE FROM product_images WHERE product_id = ?", [req.params.id], () => {
        db.query("DELETE FROM products WHERE id = ?", [req.params.id], () => {
            return res.json({ Status: "Success" });
        });
    });
});

app.get('/my-listings/:id', (req, res) => {
    db.query("SELECT * FROM products WHERE seller_id = ?", [req.params.id], (err, data) => res.json(data));
});

app.get('/my-orders/:id', (req, res) => {
    const sql = "SELECT orders.id, orders.status, orders.order_date, orders.seller_id, products.title, products.price, products.image_url, users.username as seller_name FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.seller_id = users.id WHERE orders.buyer_id = ? ORDER BY orders.order_date DESC";
    db.query(sql, [req.params.id], (err, data) => res.json(data));
});

app.get('/my-sales/:id', (req, res) => {
    const sql = "SELECT orders.id as order_id, orders.status, orders.order_date, products.title, products.image_url, products.price, users.username as buyer_name, users.phone as buyer_phone FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.buyer_id = users.id WHERE orders.seller_id = ? ORDER BY orders.order_date DESC";
    db.query(sql, [req.params.id], (err, data) => res.json(data));
});

app.put('/user/:id', upload.single('profile_pic'), (req, res) => {
    let sql = "UPDATE users SET username = ?, bio = ?";
    let params = [req.body.username, req.body.bio];
    if (req.file) { sql += ", profile_pic = ?"; params.push(req.file.path); }
    sql += " WHERE id = ?"; params.push(req.params.id);
    db.query(sql, params, (err) => {
        if(err) return res.json({Error: "Update Failed"});
        db.query("SELECT id, username, email, bio, profile_pic, role FROM users WHERE id = ?", [req.params.id], (err2, data) => {
            return res.json({ Status: "Success", user: data[0] });
        });
    });
});

app.post('/wishlist/toggle', verifyUser, (req, res) => {
    const { product_id } = req.body;
    db.query("SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, product_id], (err, data) => {
        if (data.length > 0) {
            db.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, product_id], () => res.json({ Status: "Removed" }));
        } else {
            db.query("INSERT INTO wishlist (`user_id`, `product_id`) VALUES (?)", [[req.user_id, product_id]], () => res.json({ Status: "Added" }));
        }
    });
});

app.get('/wishlist/:userId', (req, res) => {
    db.query("SELECT products.*, wishlist.id as wishlist_id FROM wishlist JOIN products ON wishlist.product_id = products.id WHERE wishlist.user_id = ?", [req.params.userId], (err, data) => res.json(data));
});

app.post('/contact', (req, res) => {
    transporter.sendMail({ from: 'ThriftLy', to: process.env.EMAIL_USER, subject: `Support: ${req.body.name}`, text: req.body.message })
        .catch(e => console.log(e));
    res.json({ Status: "Success" });
});

app.post('/forgot-password', (req, res) => {
    const otp = Math.floor(1000 + Math.random() * 9000);
    db.query("UPDATE users SET otp_code = ? WHERE email = ?", [otp, req.body.email], (err, result) => {
        if (err || result.affectedRows === 0) return res.json({ Error: "Email not found" });
        transporter.sendMail({ from: 'ThriftLy', to: req.body.email, subject: 'Reset Password', text: `OTP: ${otp}` });
        return res.json({ Status: "Success" });
    });
});

app.post('/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [email, otp], (err, data) => {
        if (data.length === 0) return res.json({ Error: "Invalid OTP" });
        bcrypt.hash(newPassword.toString(), 10, (err, hash) => {
            db.query("UPDATE users SET password = ?, otp_code = NULL WHERE email = ?", [hash, email], () => res.json({ Status: "Success" }));
        });
    });
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));