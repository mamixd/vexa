const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Mongoose 6+ doesn't need useNewUrlParser or useUnifiedTopology
        });
        console.log(`MongoDB Bağlandı: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Hata: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
