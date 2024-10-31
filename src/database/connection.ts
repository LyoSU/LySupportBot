import mongoose from "mongoose";

const connectWithRetry = async (retries = 5, delay = 5000): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MongoDB URI is not provided");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    console.log("Successfully connected to MongoDB");
  } catch (error) {
    if (retries === 0) {
      console.error("MongoDB connection error:", error);
      console.error("Max retries reached. Exiting...");
      process.exit(1);
    } else {
      console.error(`MongoDB connection error: ${error}. Retrying in ${delay / 1000} seconds...`);
      setTimeout(() => connectWithRetry(retries - 1, delay * 2), delay); // Exponential backoff
    }
  }
};

connectWithRetry();

mongoose.connection.on("error", async (error) => {
  console.error("MongoDB connection error:", error);
  if (error.name === "MongoNetworkError") {
    console.log("Network error detected. Attempting to reconnect...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    connectWithRetry();
  }
});

mongoose.connection.on("disconnected", async () => {
  console.log("MongoDB disconnected. Attempting to reconnect...");
  await new Promise((resolve) => setTimeout(resolve, 5000));
  connectWithRetry();
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed through app termination");
  process.exit(0);
});

export default mongoose.connection;