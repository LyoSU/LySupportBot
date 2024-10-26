import mongoose from "mongoose";

export async function connectMongoose(): Promise<typeof mongoose> {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MongoDB URI is not provided");
    }

    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    mongoose.connection.on("connected", () => {
      console.log("MongoDB connection established successfully");
    });

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error: ", err);
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB connection disconnected");
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed through app termination");
        process.exit(0);
      } catch (err) {
        console.error("Error during connection closure:", err);
        process.exit(1);
      }
    });

    return connection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}