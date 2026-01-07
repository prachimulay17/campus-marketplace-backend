import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Books", "Electronics", "Furniture", "Clothing", "Others"],
        message: "Category must be one of: Books, Electronics, Furniture, Clothing, Others",
      },
    },

    condition: {
      type: String,
      required: [true, "Condition is required"],
      enum: {
        values: ["New", "Like New", "Used", "Poor"],
        message: "Condition must be one of: New, Like New, Used, Poor",
      },
    },

    images: [{
      type: String,
      required: [true, "At least one image is required"],
    }],

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller is required"],
    },

    isSold: {
      type: Boolean,
      default: false,
    },

    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },

    tags: [{
      type: String,
      trim: true,
    }],
  },
  { timestamps: true }
);

// Index for search functionality
itemSchema.index({ title: "text", description: "text", tags: "text" });

// Index for filtering
itemSchema.index({ category: 1, condition: 1, price: 1, isSold: 1 });

export const Item = mongoose.model("Item", itemSchema);
