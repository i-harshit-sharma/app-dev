const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in backend/.env");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    const dbName = conn.connection.name;
    const dbHost = conn.connection.host;

    console.log(`MongoDB Connected (${dbName} @ ${dbHost})`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;