import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // 這裡使用環境變數來存儲MongoDB連線字串
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carpark';
        
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

export default connectDB;
