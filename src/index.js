import dotenv from 'dotenv';
import express from 'express';
import { app } from './app.js';
import connectDB from './db/index.js';  
dotenv.config();


const PORT = process.env.PORT || 8000;


connectDB();
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


