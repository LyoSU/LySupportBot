import mongoose from "mongoose";
import { logger } from "../utils";

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnecting: boolean = false;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(uri?: string): Promise<mongoose.Connection> {
    if (this.isConnecting) {
      logger.info("Connection already in progress");
      return mongoose.connection;
    }

    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    this.isConnecting = true;
    const mongoUri = uri || process.env.MONGO_URI;

    try {
      if (!mongoUri) {
        throw new Error("MongoDB URI is not provided");
      }

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
        retryWrites: true,
        heartbeatFrequencyMS: 10000,
        connectTimeoutMS: 30000,
        family: 4,
      });

      logger.info("Successfully connected to MongoDB");

      mongoose.connection.on("error", (error) => {
        logger.error("MongoDB connection error:", error);
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
        this.isConnecting = false;
      });

      process.on("SIGINT", async () => {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed through app termination");
        process.exit(0);
      });

      return mongoose.connection;
    } catch (error) {
      logger.error("Failed to connect to MongoDB:", error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }
}

export const dbConnection = DatabaseConnection.getInstance();
export const connectMongoose = () => dbConnection.connect();
export default mongoose.connection;
