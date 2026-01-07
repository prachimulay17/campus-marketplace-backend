import { Item } from "../models/item.model.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

// Create a new item
export const createItem = asyncHandler(async (req, res) => {
  const { title, description, price, category, condition, images, location, tags } = req.body;
  const sellerId = req.user._id;

  const item = await Item.create({
    title,
    description,
    price,
    category,
    condition,
    images,
    seller: sellerId,
    location,
    tags: tags || [],
  });

  // Populate seller info
  const populatedItem = await Item.findById(item._id).populate("seller", "name college avatar");

  res.status(201).json({
    success: true,
    message: "Item created successfully",
    data: {
      item: populatedItem,
    },
  });
});

// Get all items with optional filtering and search
export const getAllItems = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    condition,
    minPrice,
    maxPrice,
    location,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 12,
  } = req.query;

  // Build query object
  const query = { isSold: false };

  // Search functionality
  if (search) {
    query.$text = { $search: search };
  }

  // Filters
  if (category) query.category = category;
  if (condition) query.condition = condition;
  if (location) query.location = { $regex: location, $options: "i" };

  // Price range
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Sorting
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Execute query
  const items = await Item.find(query)
    .populate("seller", "name college avatar")
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit));

  // Get total count for pagination
  const totalItems = await Item.countDocuments(query);
  const totalPages = Math.ceil(totalItems / Number(limit));

  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    },
  });
});

// Get single item by ID
export const getItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await Item.findById(id).populate("seller", "name college avatar email");

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found",
    });
  }

  res.status(200).json({
    success: true,
    data: {
      item,
    },
  });
});

// Update item (only seller can update)
export const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Remove fields that shouldn't be updated directly
  delete updates.seller;
  delete updates.isSold;

  const item = await Item.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  ).populate("seller", "name college avatar");

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Item updated successfully",
    data: {
      item,
    },
  });
});

// Delete item (only seller can delete)
export const deleteItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await Item.findByIdAndDelete(id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Item deleted successfully",
  });
});

// Mark item as sold (only seller can mark as sold)
export const markItemAsSold = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await Item.findByIdAndUpdate(
    id,
    { isSold: true },
    { new: true }
  ).populate("seller", "name college avatar");

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Item marked as sold",
    data: {
      item,
    },
  });
});

// Get items by seller
export const getItemsBySeller = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const items = await Item.find({ seller: sellerId })
    .populate("seller", "name college avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const totalItems = await Item.countDocuments({ seller: sellerId });
  const totalPages = Math.ceil(totalItems / Number(limit));

  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    },
  });
});

// Get user's own items
export const getMyItems = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const items = await Item.find({ seller: sellerId })
    .populate("seller", "name college avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const totalItems = await Item.countDocuments({ seller: sellerId });
  const totalPages = Math.ceil(totalItems / Number(limit));

  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    },
  });
});
