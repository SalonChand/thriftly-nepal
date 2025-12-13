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

app.use(cors({ origin: ["http://localhost:5173"], methods: ["POST", "GET", "PUT", "DELETE"], credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// EMAIL
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// DATABASE (Using createPool for better stability)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASS || '', 
    database: process.env.DB_NAME || 'thrift_store_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check connection
db.getConnection((err, connection) => {
    if (err) console.log("❌ DB Connection Error:", err.message);
    else {
        console.log('✅ MySQL Connected Successfully');
        connection.release();
    }
});

// MULTER
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

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

// --- ROUTES ---

// 1. REGISTER
app.post('/register', (req, res) => {
    const { username, email, password, phone } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000);
    const sql = "INSERT INTO users (`username`, `email`, `password`, `phone`, `otp_code`, `is_verified`) VALUES (?)";
    
    bcrypt.hash(password.toString(), 10, (err, hash) => {
        if (err) return res.json({ Error: "Hash Error" });
        
        db.query(sql, [[username, email, hash, phone, otp, 0]], (err2, result) => {
            if (err2) return res.json({ Error: "User exists" });
            
            transporter.sendMail({ from: 'ThriftLy', to: email, subject: 'Verify', text: `OTP: ${otp}` })
                .catch(e => console.log("Email failed"));
                
            return res.json({ Status: "Success" });
        });
    });
});

// 2. VERIFY
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

// 3. LOGIN
app.post('/login', (req, res) => {
    db.query("SELECT * FROM users WHERE email = ?", [req.body.email], (err, data) => {
        if (err) return res.json({ Error: "DB Error" });
        if (data.length > 0) {
            if(data[0].is_verified === 0) return res.json({ Error: "Not Verified" });
            
            bcrypt.compare(req.body.password.toString(), data[0].password, (err2, response) => {
                if (response) {
                    const { id, username, role, profile_pic, bio } = data[0];
                    const token = jwt.sign({ username, id, role }, SECRET_KEY, { expiresIn: '1d' });
                    res.cookie('token', token);
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

// --- PRODUCTS ---

// Upload (Multiple Images)
app.post('/products', verifyUser, upload.array('images', 5), (req, res) => {
    const { title, description, price, category, size, condition } = req.body;
    const mainImage = req.files.length > 0 ? req.files[0].filename : null;

    const sql = "INSERT INTO products (`title`, `description`, `price`, `category`, `image_url`, `seller_id`, `size`, `item_condition`) VALUES (?)";
    const values = [title, description, price, category, mainImage, req.user_id, size, condition];
    
    db.query(sql, [values], (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ Error: "Upload DB Error" });
        }
        
        const productId = result.insertId;
        // Save extra images
        if (req.files.length > 0) {
            const imageValues = req.files.map(file => [productId, file.filename]);
            db.query("INSERT INTO product_images (product_id, image_url) VALUES ?", [imageValues], (err2) => {
                if(err2) console.log("Extra images error");
            });
        }
        return res.json({ Status: "Success" });
    });
});

// Get All (For Home)
app.get('/products', (req, res) => {
    db.query("SELECT * FROM products WHERE is_sold = 0 ORDER BY created_at DESC", (err, data) => {
        if (err) return res.json({ Error: "DB Error" });
        return res.json(data);
    });
});

// Get All (For Admin)
app.get('/all-products', (req, res) => {
    db.query("SELECT * FROM products ORDER BY created_at DESC", (err, data) => {
        if (err) return res.json({ Error: "DB Error" });
        return res.json(data);
    });
});

// Get Single
app.get('/products/:id', (req, res) => {
    const sql = "SELECT products.*, users.phone as seller_phone, users.username as seller_name FROM products JOIN users ON products.seller_id = users.id WHERE products.id = ?";
    db.query(sql, [req.params.id], (err, productData) => {
        if (err || productData.length === 0) return res.json({});
        const product = productData[0];
        
        db.query("SELECT image_url FROM product_images WHERE product_id = ?", [req.params.id], (err2, imageData) => {
            const images = imageData.map(img => img.image_url);
            if (!images.includes(product.image_url)) images.unshift(product.image_url);
            product.images = images;
            return res.json(product);
        });
    });
});

// --- BUY & DELETE ---
app.post('/buy/:id', verifyUser, (req, res) => {
    const { seller_id } = req.body;
    db.query("UPDATE products SET is_sold = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.json({ Error: "Update Error" });
        db.query("INSERT INTO orders (`product_id`, `buyer_id`, `seller_id`) VALUES (?)", [[req.params.id, req.user_id, seller_id]], () => {
            return res.json({ Status: "Success" });
        });
    });
});

app.delete('/products/:id', (req, res) => {
    // Cascade delete handles Wishlist/Images in DB, but we do it manually to be safe
    db.query("DELETE FROM product_images WHERE product_id = ?", [req.params.id], () => {
        db.query("DELETE FROM products WHERE id = ?", [req.params.id], (err) => {
            if(err) return res.json({Error: "Delete Error"});
            return res.json({ Status: "Success" });
        });
    });
});

// --- REVIEWS ---
app.post('/reviews', verifyUser, (req, res) => {
    const { seller_id, rating, comment } = req.body;
    if(Number(seller_id) === Number(req.user_id)) return res.json({Error: "No self-review"});
    db.query("INSERT INTO reviews (`reviewer_id`, `seller_id`, `rating`, `comment`) VALUES (?)", [[req.user_id, seller_id, rating, comment]], (err) => {
        if (err) return res.json({Error: "DB Error"});
        return res.json({ Status: "Success" });
    });
});

app.get('/reviews/:seller_id', (req, res) => {
    db.query("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE seller_id = ?", [req.params.seller_id], (err, data) => {
        return res.json({ avg: data[0].avg_rating || 0, count: data[0].count || 0 });
    });
});

// --- ADMIN & USERS ---
app.get('/users', (req, res) => {
    db.query("SELECT id, username, email, role, is_verified FROM users", (err, data) => {
        return res.json(data);
    });
});
app.delete('/users/:id', (req, res) => {
    db.query("DELETE FROM users WHERE id = ?", [req.params.id], () => {
        return res.json({ Status: "Success" });
    });
});
app.get('/admin/orders', (req, res) => {
    const sql = "SELECT orders.id, orders.order_date, products.title, products.price, products.image_url, buyer.username AS buyer_name, seller.username AS seller_name FROM orders JOIN products ON orders.product_id = products.id JOIN users AS buyer ON orders.buyer_id = buyer.id JOIN users AS seller ON orders.seller_id = seller.id ORDER BY orders.order_date DESC";
    db.query(sql, (err, data) => res.json(data));
});

// --- PROFILE ---
app.get('/my-listings/:id', (req, res) => {
    db.query("SELECT * FROM products WHERE seller_id = ?", [req.params.id], (err, data) => res.json(data));
});
app.get('/my-orders/:id', (req, res) => {
    const sql = "SELECT orders.id, orders.status, orders.order_date, orders.seller_id, products.title, products.price, products.image_url, users.username as seller_name FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.seller_id = users.id WHERE orders.buyer_id = ?";
    db.query(sql, [req.params.id], (err, data) => res.json(data));
});
app.get('/my-sales/:id', (req, res) => {
    const sql = "SELECT orders.id as order_id, orders.status, orders.order_date, products.title, products.image_url, products.price, users.username as buyer_name, users.phone as buyer_phone FROM orders JOIN products ON orders.product_id = products.id JOIN users ON orders.buyer_id = users.id WHERE orders.seller_id = ?";
    db.query(sql, [req.params.id], (err, data) => res.json(data));
});
app.put('/user/:id', upload.single('profile_pic'), (req, res) => {
    let sql = "UPDATE users SET username = ?, bio = ?";
    let params = [req.body.username, req.body.bio];
    if (req.file) { sql += ", profile_pic = ?"; params.push(req.file.filename); }
    sql += " WHERE id = ?"; params.push(req.params.id);
    db.query(sql, params, () => res.json({ Status: "Success" }));
});

// --- WISHLIST ---
app.post('/wishlist/toggle', verifyUser, (req, res) => {
    const { product_id } = req.body;
    db.query("SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?", [req.user_id, product_id], (err, data) => {
        if(err) return res.json({Error: "DB Error"});
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

// --- EXTRAS ---
app.post('/contact', (req, res) => {
    transporter.sendMail({ from: 'ThriftLy', to: process.env.EMAIL_USER, subject: `Support: ${req.body.name}`, text: req.body.message });
    res.json({ Status: "Success" });
});
app.post('/forgot-password', (req, res) => {
    const otp = Math.floor(1000 + Math.random() * 9000);
    db.query("UPDATE users SET otp_code = ? WHERE email = ?", [otp, req.body.email], (err, result) => {
        if(err || result.affectedRows === 0) return res.json({Error: "Email not found"});
        transporter.sendMail({ from: 'ThriftLy', to: req.body.email, subject: 'Reset Password', text: `OTP: ${otp}` });
        return res.json({ Status: "Success" });
    });
});
app.post('/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND otp_code = ?", [email, otp], (err, data) => {
        if(data.length === 0) return res.json({Error: "Invalid OTP"});
        bcrypt.hash(newPassword.toString(), 10, (err, hash) => {
            db.query("UPDATE users SET password = ?, otp_code = NULL WHERE email = ?", [hash, email], () => res.json({ Status: "Success" }));
        });
    });
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));