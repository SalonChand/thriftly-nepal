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

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey"; 

// 1. FIX CORS
app.use(cors({ 
    origin: ["http://localhost:5173"], 
    methods: ["POST", "GET", "PUT", "DELETE"], 
    credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

// 2. FIX IMAGE PATH
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

// 3. DATABASE CONNECTION
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASS || '', 
    database: process.env.DB_NAME || 'thrift_store_db'
});

db.connect((err) => { 
    if (err) console.log("❌ DB Error:", err.message); 
    else console.log('✅ MySQL Connected'); 
});

// --- EMAIL SETUP ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// --- FILE UPLOAD ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- MIDDLEWARE ---
const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.json({ Error: "Not authenticated" });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.json({ Error: "Invalid Token" });
        req.user_id = decoded.id; 
        next();
    });
};

// ================= ROUTES =================

// Auth
app.post('/register', (req, res) => {
    const { username, email, password, phone } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000);
    const sql = "INSERT INTO users (`username`, `email`, `password`, `phone`, `otp_code`, `is_verified`) VALUES (?)";
    
    bcrypt.hash(password.toString(), 10, (err, hash) => {
        if (err) return res.json({ Error: "Hashing Error" });
        
        db.query(sql, [[username, email, hash, phone, otp, 0]], (err) => {
            if (err) return res.json({ Error: "Email already exists" });
            transporter.sendMail({ from: 'ThriftLy', to: email, subject: 'Verify Account', text: `Your OTP: ${otp}` });
            return res.json({ Status: "Success" });
        });
    });
});

app.post('/verify', (req, res) => {
    db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [req.body.email, req.body.otp], (err, data) => {
        if(err) return res.json({ Error: "DB Error" });
        if(data.length > 0) {
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
            if(data[0].is_verified === 0) return res.json({ Error: "Not Verified" });
            
            bcrypt.compare(req.body.password.toString(), data[0].password, (err, response) => {
                if (response) {
                    const token = jwt.sign({ username: data[0].username, id: data[0].id, role: data[0].role }, SECRET_KEY, { expiresIn: '1d' });
                    res.cookie('token', token, { httpOnly: true });
                    return res.json({ Status: "Success", user: data[0], token });
                } else { 
                    return res.json({ Error: "Wrong Password" }); 
                }
            });
        } else { 
            return res.json({ Error: "User not found" }); 
        }
    });
});

// Forgot Password
app.post('/forgot-password', (req, res) => {
    const email = req.body.email;
    const otp = Math.floor(1000 + Math.random() * 9000);
    db.query("UPDATE users SET otp_code = ? WHERE email = ?", [otp, email], (err, result) => {
        if(err || result.affectedRows === 0) return res.json({Error: "Email not found"});
        
        transporter.sendMail({ from: 'ThriftLy', to: email, subject: 'Reset Password', text: `OTP: ${otp}` });
        return res.json({ Status: "Success" });
    });
});

app.post('/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [email, otp], (err, data) => {
        if(err) return res.json({Error: "DB Error"});
        if(data.length === 0) return res.json({Error: "Invalid OTP"});
        
        bcrypt.hash(newPassword.toString(), 10, (err, hash) => {
            db.query("UPDATE users SET password = ?, otp_code = NULL WHERE email = ?", [hash, email], () => {
                return res.json({ Status: "Success" });
            });
        });
    });
});

// Products
app.get('/products', (req, res) => {
    db.query("SELECT * FROM products WHERE is_sold = 0 ORDER BY created_at DESC", (err, data) => {
        if(err) return res.json([]); 
        return res.json(data);
    });
});

app.get('/all-products', (req, res) => {
    db.query("SELECT * FROM products ORDER BY created_at DESC", (err, data) => {
        if(err) return res.json([]);
        return res.json(data);
    });
});

app.get('/products/:id', (req, res) => {
    const sql = "SELECT products.*, users.phone as seller_phone, users.username as seller_name FROM products JOIN users ON products.seller_id = users.id WHERE products.id = ?";
    db.query(sql, [req.params.id], (err, data) => {
        if(err || data.length === 0) return res.json({});
        return res.json(data[0]);
    });
});

// Upload
app.post('/products', verifyUser, upload.single('image'), (req, res) => {
    const { title, description, price, category, size, condition } = req.body;
    const sql = "INSERT INTO products (`title`, `description`, `price`, `category`, `image_url`, `seller_id`, `size`, `item_condition`) VALUES (?)";
    const values = [title, description, price, category, req.file.filename, req.user_id, size, condition];
    
    db.query(sql, [values], (err) => {
        if(err) {
            console.log(err);
            return res.json({Error: "Upload Error"});
        }
        return res.json({ Status: "Success" });
    });
});

// Admin & Users
app.get('/users', (req, res) => {
    db.query("SELECT id, username, email, role, is_verified FROM users", (err, data) => {
        if(err) return res.json([]);
        return res.json(data);
    });
});

app.get('/admin/orders', (req, res) => {
    const sql = "SELECT orders.id, orders.order_date, products.title, products.price, products.image_url, buyer.username AS buyer_name, seller.username AS seller_name, seller.phone AS seller_phone FROM orders JOIN products ON orders.product_id = products.id JOIN users AS buyer ON orders.buyer_id = buyer.id JOIN users AS seller ON orders.seller_id = seller.id ORDER BY orders.order_date DESC";
    db.query(sql, (err, data) => {
        if(err) return res.json([]);
        return res.json(data);
    });
});

// Buy
app.post('/buy/:id', verifyUser, (req, res) => {
    const buyer_id = req.user_id; 
    const { seller_id } = req.body;
    const product_id = req.params.id;

    db.query("UPDATE products SET is_sold = 1 WHERE id = ?", [product_id], (err) => {
        if(err) return res.json({Error: "DB Error"});
        
        db.query("INSERT INTO orders (`product_id`, `buyer_id`, `seller_id`) VALUES (?)", [[product_id, buyer_id, seller_id]], (err2) => {
            if(err2) return res.json({Error: "Order Error"});
            
            // Email Logic
            const emailSql = "SELECT email, username, id FROM users WHERE id IN (?, ?)";
            db.query(emailSql, [buyer_id, seller_id], (err3, users) => {
                if(!err3 && users) {
                    const seller = users.find(u => u.id == seller_id);
                    if(seller) {
                        transporter.sendMail({
                            from: 'ThriftLy', to: seller.email, 
                            subject: '🎉 Item Sold!', 
                            text: `Good news ${seller.username}! Someone bought your item.`
                        }).catch(e => console.log("Email failed", e));
                    }
                }
            });

            return res.json({ Status: "Success" });
        });
    });
});

// Reviews
app.post('/reviews', verifyUser, (req, res) => {
    const { seller_id, rating, comment } = req.body;
    if(Number(seller_id) === Number(req.user_id)) return res.json({Error: "Self-review blocked"});
    
    db.query("INSERT INTO reviews (`reviewer_id`, `seller_id`, `rating`, `comment`) VALUES (?)", [[req.user_id, seller_id, rating, comment]], (err) => {
        if(err) return res.json({Error: "DB Error"});
        return res.json({ Status: "Success" });
    });
});

app.get('/reviews/:seller_id', (req, res) => {
    db.query("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE seller_id = ?", [req.params.seller_id], (err, data) => {
        if(err) return res.json({ avg: 0, count: 0 });
        return res.json({ avg: data[0].avg_rating || 0, count: data[0].count || 0 });
    });
});

// Wishlist
app.post('/wishlist/toggle', verifyUser, (req, res) => {
    const { product_id } = req.body;
    db.query("SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, product_id], (err, data) => {
        if (data.length > 0) {
            db.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, product_id], () => {
                return res.json({ Status: "Removed" });
            });
        } else {
            db.query("INSERT INTO wishlist (`user_id`, `product_id`) VALUES (?)", [[req.user_id, product_id]], () => {
                return res.json({ Status: "Added" });
            });
        }
    });
});

app.get('/wishlist/:userId', (req, res) => {
    db.query("SELECT products.*, wishlist.id as wishlist_id FROM wishlist JOIN products ON wishlist.product_id = products.id WHERE wishlist.user_id = ?", [req.params.userId], (err, data) => {
        return res.json(data);
    });
});

app.get('/my-listings/:id', (req, res) => {
    db.query("SELECT * FROM products WHERE seller_id = ?", [req.params.id], (err, data) => {
        return res.json(data);
    });
});

app.get('/my-orders/:id', (req, res) => {
    const sql = "SELECT orders.id, orders.order_date, orders.seller_id, products.title, products.price, products.image_url, users.username as seller_name FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.seller_id = users.id WHERE orders.buyer_id = ?";
    db.query(sql, [req.params.id], (err, data) => {
        return res.json(data);
    });
});

app.put('/user/:id', upload.single('profile_pic'), (req, res) => {
    let sql = "UPDATE users SET username = ?, bio = ?";
    let params = [req.body.username, req.body.bio];
    if (req.file) { sql += ", profile_pic = ?"; params.push(req.file.filename); }
    sql += " WHERE id = ?"; params.push(req.params.id);
    db.query(sql, params, (err) => {
        return res.json({ Status: "Success" });
    });
});

app.delete('/users/:id', (req, res) => {
    db.query("DELETE FROM users WHERE id = ?", [req.params.id], () => {
        return res.json({ Status: "Success" });
    });
});

app.delete('/products/:id', (req, res) => {
    db.query("DELETE FROM wishlist WHERE product_id = ?", [req.params.id], () => {
        db.query("DELETE FROM orders WHERE product_id = ?", [req.params.id], () => {
            db.query("DELETE FROM products WHERE id = ?", [req.params.id], () => {
                return res.json({ Status: "Success" });
            });
        });
    });
});

// 🚚 FEATURE: SALES DASHBOARD (For Sellers to see what they need to ship)
app.get('/my-sales/:id', (req, res) => {
    const sql = `
        SELECT 
            orders.id as order_id, 
            orders.status, 
            orders.order_date,
            products.title, 
            products.image_url, 
            products.price, 
            users.username as buyer_name, 
            users.phone as buyer_phone,
            users.email as buyer_email
        FROM orders 
        JOIN products ON orders.product_id = products.id 
        JOIN users ON orders.buyer_id = users.id 
        WHERE orders.seller_id = ? 
        ORDER BY orders.order_date DESC
    `;
    db.query(sql, [req.params.id], (err, data) => {
        if(err) return res.json([]);
        return res.json(data);
    });
});

// 🚚 FEATURE: UPDATE ORDER STATUS
app.put('/order-status/:id', verifyUser, (req, res) => {
    const { status } = req.body;
    db.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
        if(err) return res.json({Error: "Update Error"});
        return res.json({ Status: "Success" });
    });
});

// 📞 FEATURE: CUSTOMER CARE EMAIL
app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;
    
    // Send email to YOU (The Admin)
    transporter.sendMail({
        from: 'ThriftLy System',
        to: process.env.EMAIL_USER, // Your email
        subject: `📢 Support Request from ${name}`,
        text: `From: ${email}\n\nMessage:\n${message}`
    });
    
    return res.json({ Status: "Success" });
});

// ⚠️ UPDATE EXISTING ROUTE: Get My Orders (Include Status)
app.get('/my-orders/:id', (req, res) => {
    const sql = "SELECT orders.id, orders.status, orders.order_date, orders.seller_id, products.title, products.price, products.image_url, users.username as seller_name FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.seller_id = users.id WHERE orders.buyer_id = ? ORDER BY orders.order_date DESC";
    db.query(sql, [req.params.id], (err, data) => res.json(data));
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));