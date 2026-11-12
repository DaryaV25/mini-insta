const mongoose = require("mongoose");

const connectMongo = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MongoDB: не задана MONGO_URI");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 20000,
    });
    console.log("MongoDB connected, state:", mongoose.connection.readyState);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
};

module.exports = connectMongo;
