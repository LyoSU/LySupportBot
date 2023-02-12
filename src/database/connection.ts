import mongoose from "mongoose";

export const connectMongoose = () => {
  const connection = mongoose.connect(process.env.MONGO_URI);

  mongoose.connection.on("connected", () => {
    console.log("Mongoose is connected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("Mongoose connection error: ", err);

    process.exit(1);
  });

  return connection;
};
