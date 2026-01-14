
import express from 'express';
import { app } from './app.js';
import connectDB from './db/index.js';



const PORT = process.env.PORT || 8000;


connectDB();
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

console.log("ENV CHECK ENTRY:", {
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY,
});

