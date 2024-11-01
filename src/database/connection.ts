import mongoose from "mongoose";

const connectWithRetry = async (retries = 5, delay = 5000): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MongoDB URI is not provided");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
      family: 4
    });

    console.log("Successfully connected to MongoDB");
  } catch (error) {
    if (retries === 0) {
      console.error("MongoDB connection error:", error);
      console.error("Max retries reached. Restarting application...");
      process.exit(1);
    } else {
      console.error(`MongoDB connection error: ${error}. Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(retries - 1, Math.min(delay * 1.5, 30000)); // Progressive backoff with max 30s
    }
  }
};

// Initial connection
connectWithRetry();

mongoose.connection.on("error", async (error) => {
  console.error("MongoDB connection error:", error);
  if (error.name === "MongoNetworkError" || error.name === "MongoTimeoutError") {
    console.log("Critical network error detected. Forcing reconnection...");
    await mongoose.connection.close(true); // Force close
    await new Promise(resolve => setTimeout(resolve, 2000));
    connectWithRetry();
  }
});

mongoose.connection.on("disconnected", async () => {
  console.log("MongoDB disconnected. Forcing reconnection...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  connectWithRetry();
});

// Add periodic connection check
setInterval(async () => {
  if (mongoose.connection.readyState !== 1) {
    console.log("Detected unhealthy connection state. Initiating reconnection...");
    await mongoose.connection.close(true);
    connectWithRetry();
  }
}, 30000);

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed through app termination");
  process.exit(0);
});

export default mongoose.connection;