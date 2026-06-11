import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Campus Marketplace API",
      version: "1.0.0",
      description: "API Documentation for the Campus Marketplace backend",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8000}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            college: { type: "string" },
            avatar: { type: "string" },
            isVerified: { type: "boolean" },
          },
        },
        Item: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
            category: { type: "string" },
            condition: { type: "string" },
            images: { type: "array", items: { type: "string" } },
            seller: { $ref: "#/components/schemas/User" },
            isSold: { type: "boolean" },
            location: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        cookieAuth: [],
      },
    ],
    paths: {
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password", "college"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 6 },
                    college: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Registration successful" },
            400: { description: "Validation error or user exists" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login user",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Login successful" },
            401: { description: "Invalid password" },
            403: { description: "Email not verified" },
            404: { description: "User not found" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout user",
          responses: {
            200: { description: "Logout successful" },
          },
        },
      },
      "/api/auth/refresh-token": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
          security: [],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Token refreshed successfully" },
            401: { description: "Invalid or missing token" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current logged in user profile",
          responses: {
            200: { description: "User details returned" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/profile": {
        patch: {
          tags: ["Auth"],
          summary: "Update user profile",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    college: { type: "string" },
                    avatar: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Profile updated successfully" },
          },
        },
      },
      "/api/auth/change-password": {
        patch: {
          tags: ["Auth"],
          summary: "Change password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currentPassword", "newPassword"],
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string", minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Password changed successfully" },
            400: { description: "Incorrect current password" },
          },
        },
      },
      "/api/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Request password reset email",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } },
                },
              },
            },
          },
          responses: {
            200: { description: "Reset email sent" },
          },
        },
      },
      "/api/auth/reset-password/{token}": {
        post: {
          tags: ["Auth"],
          summary: "Reset password using token",
          security: [],
          parameters: [
            { name: "token", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["password"],
                  properties: { password: { type: "string", minLength: 6 } },
                },
              },
            },
          },
          responses: {
            200: { description: "Password reset successful" },
            400: { description: "Invalid or expired token" },
          },
        },
      },
      "/api/otp/send": {
        post: {
          tags: ["OTP"],
          summary: "Send an OTP to the provided email",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } },
                },
              },
            },
          },
          responses: {
            200: { description: "OTP sent successfully" },
          },
        },
      },
      "/api/otp/verify": {
        post: {
          tags: ["OTP"],
          summary: "Verify an OTP",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "otp"],
                  properties: {
                    email: { type: "string", format: "email" },
                    otp: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "OTP verified" },
            400: { description: "OTP invalid or expired" },
          },
        },
      },
      "/api/items": {
        get: {
          tags: ["Items"],
          summary: "Get all items (with optional filters)",
          security: [],
          parameters: [
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "condition", in: "query", schema: { type: "string" } },
            { name: "minPrice", in: "query", schema: { type: "number" } },
            { name: "maxPrice", in: "query", schema: { type: "number" } },
            { name: "location", in: "query", schema: { type: "string" } },
            { name: "sortBy", in: "query", schema: { type: "string" } },
            { name: "sortOrder", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            200: { description: "List of items" },
          },
        },
        post: {
          tags: ["Items"],
          summary: "Create a new item",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "description", "price", "category", "condition", "images"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    price: { type: "number" },
                    category: { type: "string" },
                    condition: { type: "string" },
                    images: { type: "array", items: { type: "string", format: "uri" } },
                    location: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Item created" },
          },
        },
      },
      "/api/items/{id}": {
        get: {
          tags: ["Items"],
          summary: "Get item by ID",
          security: [],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Item found" },
            404: { description: "Item not found" },
          },
        },
        patch: {
          tags: ["Items"],
          summary: "Update an item",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    price: { type: "number" },
                    category: { type: "string" },
                    condition: { type: "string" },
                    images: { type: "array", items: { type: "string" } },
                    location: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Item updated" },
          },
        },
        delete: {
          tags: ["Items"],
          summary: "Delete an item",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Item deleted" },
          },
        },
      },
      "/api/items/{id}/sold": {
        patch: {
          tags: ["Items"],
          summary: "Mark item as sold",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Item marked as sold" },
          },
        },
      },
      "/api/items/seller/{sellerId}": {
        get: {
          tags: ["Items"],
          summary: "Get items by seller ID",
          security: [],
          parameters: [
            { name: "sellerId", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            200: { description: "List of items for the seller" },
          },
        },
      },
      "/api/items/user/my-items": {
        get: {
          tags: ["Items"],
          summary: "Get my items",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            200: { description: "List of current user's items" },
          },
        },
      },
      "/api/upload/images": {
        post: {
          tags: ["Uploads"],
          summary: "Upload multiple images",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    images: {
                      type: "array",
                      items: { type: "string", format: "binary" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Images uploaded successfully" },
            400: { description: "No files uploaded" },
          },
        },
      },
      "/api/chat/conversations": {
        get: {
          tags: ["Chat"],
          summary: "Get user's inbox (all conversations)",
          responses: {
            200: { description: "List of conversations" },
          },
        },
        post: {
          tags: ["Chat"],
          summary: "Create or get conversation",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["itemId", "sellerId"],
                  properties: {
                    itemId: { type: "string" },
                    sellerId: { type: "string" },
                    initialMessage: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Conversation initialized" },
          },
        },
      },
      "/api/chat/conversations/{id}/messages": {
        get: {
          tags: ["Chat"],
          summary: "Get messages for a conversation",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            200: { description: "Paginated list of messages" },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
