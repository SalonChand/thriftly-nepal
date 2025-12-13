const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
       user: 'shopthriftlynepal@gmail.com', // ⚠️ PUT YOUR REAL GMAIL HERE
        pass: 'dkfr jvgz aktt btjo'  // ⚠️ PUT YOUR 16-CHAR APP PASSWORD HERE
    }
});

const mailOptions = {
    from: 'Thrift Test',
    to: 'shopthriftlynepal@gmail.com', // Send it to yourself
    subject: 'Test Email',
    text: 'If you see this, Nodemailer is working!'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log("❌ FAILED:", error);
    } else {
        console.log("✅ SUCCESS! Email sent: " + info.response);
    }
});