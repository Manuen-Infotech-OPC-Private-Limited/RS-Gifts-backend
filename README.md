# RS-Gifts Backend API 🎁

A robust, production-grade **Node.js + Express + MongoDB** REST API backend powering both the **Admin Dashboard** and the **Customer Storefront** for RS-Gifts.

---

## 🌟 Key Features

* **Admin Operations**:
  * 🔐 **Secure Authentication**: JWT-based authentication with bcrypt-hashed passwords.
  * 📊 **Dashboard Analytics**: Revenue calculations, order statistics, stock warnings, and 7-day sales graph data.
  * 📦 **Product Catalog Management**: Products with custom text/engraving options, photo upload requirements, and gift-wrap settings.
  * 🏷️ **Categories & Occasions**: Multi-category and occasion tagging system.
  * 🛒 **Order Fulfillment Lifecycle**: Tracking statuses (`Pending` $\rightarrow$ `Processing` $\rightarrow$ `Shipped` $\rightarrow$ `Delivered` $\rightarrow$ `Cancelled`), automated stock deduction and restocking.
  * 👥 **Customer CRM**: Customer purchase aggregations, order count, total spending, and status controls.
  * 🎟️ **Coupons & Promotions**: Percentage and flat discount rules, minimum order value thresholds, and usage limits.
  * 🖼️ **Content Management**: Homepage hero banners and campaign promotions.
  * ⭐ **Review Moderation**: Approve, reject, and reply to customer product reviews.
  * ⚙️ **Store Settings**: Real-time shipping fee thresholds, COD toggles, and Cloudinary keys.

* **Customer Operations**:
  * 👤 **Customer Authentication & Profiles**: Registration, login, profile updates, and saved shipping addresses.
  * 🛍️ **Public Catalog**: Browsing with filtering (category, occasion, price range, stock availability), full-text search, and multiple sort orders.
  * 🏷️ **Discount Coupons**: Live coupon validation and discount calculation at checkout.
  * 💳 **Checkout & Orders**: Place orders (Cash on Delivery or Online), track live status, and cancel pending orders.
  * ✍️ **Product Reviews**: Submit star ratings and customer feedback.
  * 🖼️ **Storefront Assets**: Fetch active banners, categories, occasions, and store contact info.

* **Media Uploads**:
  * 📷 Hybrid upload engine supporting both **Cloudinary CDN** and local static storage (`/uploads/`).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB** (A MongoDB Atlas connection string or remote cluster)

### 2. Configure Environment Variables
Open the `.env` file in the root directory and set your MongoDB connection string:

```env
PORT=5000
NODE_ENV=development

# Paste your MongoDB Atlas or remote connection string here:
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/RSGIFTS?retryWrites=true&w=majority
MONGO_DB_NAME=RSGIFTS

# JWT Secret Key
JWT_SECRET=rs_gifts_super_secret_jwt_key_2026_secure
JWT_EXPIRES_IN=7d

# Allowed Frontend Origins
CLIENT_ADMIN_URL=http://localhost:3000
CLIENT_STOREFRONT_URL=http://localhost:5173

# Optional: Cloudinary CDN Keys
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 3. Seed Initial Database
Once your `MONGO_URI` is configured in `.env`, run the seeder script to populate default categories, settings, banners, sample products, and the super-admin account:

```bash
npm run seed
```

> **Default Administrator Credentials**:
> - **Email**: `admin@rsgifts.com`
> - **Password**: `Admin@123`

### 4. Start the Server
* **Development mode (with auto-reload)**:
  ```bash
  npm run dev
  ```
* **Production mode**:
  ```bash
  npm start
  ```

Server will run on: **`http://localhost:5000`**  
Health Check: **`http://localhost:5000/api/health`**

---

## 📡 API Reference Overview

### Health & Server Check
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service status, uptime, and database connection | Public |

---

### Admin Endpoints (`/api/admin/...`)
*All endpoints (except login and initial setup) require `Authorization: Bearer <ADMIN_JWT_TOKEN>`*

#### 1. Authentication
* `POST /api/admin/auth/login` - Admin login (returns JWT token and profile)
* `GET /api/admin/auth/profile` - Get logged-in admin profile
* `PUT /api/admin/auth/profile` - Update admin profile or password
* `POST /api/admin/auth/register-initial` - One-time setup of first admin (disabled once an admin exists)

#### 2. Dashboard Analytics
* `GET /api/admin/dashboard/stats` - Total revenue, orders, active customers, low-stock count, weekly sales series, and latest 5 orders

#### 3. Products Management
* `GET /api/admin/products` - List products with filters (`category`, `occasion`, `search`, `lowStock`, `outOfStock`, `sort`)
* `POST /api/admin/products` - Create new gift product
* `GET /api/admin/products/:id` - Get product by ID
* `PUT /api/admin/products/:id` - Update product details
* `DELETE /api/admin/products/:id` - Delete product
* `PATCH /api/admin/products/:id/toggle-active` - Toggle Active / Draft status
* `PATCH /api/admin/products/:id/toggle-featured` - Toggle Featured badge
* `PATCH /api/admin/products/:id/stock` - Quick stock update (`{ stock: 20 }` or `{ delta: +5 }`)

#### 4. Categories & Occasions
* `GET /api/admin/categories` - List all categories
* `POST /api/admin/categories` - Create category
* `PUT /api/admin/categories/:id` - Update category
* `DELETE /api/admin/categories/:id` - Delete category
* `PATCH /api/admin/categories/:id/toggle-active` - Toggle visibility
* `GET /api/admin/occasions` - List all occasions
* `POST /api/admin/occasions` - Create occasion
* `PUT /api/admin/occasions/:id` - Update occasion
* `DELETE /api/admin/occasions/:id` - Delete occasion

#### 5. Order Management
* `GET /api/admin/orders` - List all orders with filters (`status`, `paymentStatus`, `search`, `sort`)
* `GET /api/admin/orders/:id` - Full order details with personalization notes and customer contact
* `PATCH /api/admin/orders/:id/status` - Update status (`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`). *Automatically restocks inventory if Cancelled.*
* `PATCH /api/admin/orders/:id/payment-status` - Update payment status (`Pending`, `Paid`, `Failed`, `Refunded`)

#### 6. Customers CRM
* `GET /api/admin/customers` - List registered customers with order count and total spend
* `GET /api/admin/customers/:id` - Customer profile with full purchase history
* `PATCH /api/admin/customers/:id/toggle-status` - Block / Unblock customer account

#### 7. Coupons & Promotions
* `GET /api/admin/coupons` - List all coupons
* `POST /api/admin/coupons` - Create coupon (code, percentage/flat, min order value, max discount, expiry)
* `PUT /api/admin/coupons/:id` - Update coupon
* `DELETE /api/admin/coupons/:id` - Delete coupon
* `PATCH /api/admin/coupons/:id/toggle-active` - Toggle Active / Disabled

#### 8. Banners, Reviews & Settings
* `GET /api/admin/content/banners` / `POST` / `PUT` / `DELETE` - Manage promotional hero banners
* `GET /api/admin/reviews` - Moderation queue of reviews
* `PATCH /api/admin/reviews/:id/toggle-approve` - Approve / Hide review
* `PATCH /api/admin/reviews/:id/reply` - Add admin reply to review
* `DELETE /api/admin/reviews/:id` - Remove review
* `GET /api/admin/settings` - Retrieve store settings
* `PUT /api/admin/settings` - Update store settings (name, address, shipping rules, Cloudinary keys)

---

### Customer Storefront Endpoints (`/api/customer/...`)

#### 1. Customer Authentication
* `POST /api/customer/auth/register` - Customer signup
* `POST /api/customer/auth/login` - Customer login
* `GET /api/customer/auth/profile` - Profile & saved addresses (*Requires Bearer token*)
* `PUT /api/customer/auth/profile` - Update profile (*Requires Bearer token*)
* `POST /api/customer/auth/addresses` - Add saved shipping address (*Requires Bearer token*)
* `DELETE /api/customer/auth/addresses/:addressId` - Remove address (*Requires Bearer token*)

#### 2. Product Catalog
* `GET /api/customer/products` - Browse active gifts (filters: `category`, `occasion`, `search`, `minPrice`, `maxPrice`, `inStock`, `sort`, `page`, `limit`)
* `GET /api/customer/products/featured` - Featured gift highlights
* `GET /api/customer/products/:idOrSlug` - Product details with approved reviews and related gifts

#### 3. Coupons
* `POST /api/customer/coupons/validate` - Validate coupon code with `{ code: "WELCOME10", subtotal: 699 }`

#### 4. Orders & Checkout
* `POST /api/customer/orders` - Place order (Cash on Delivery or Online). Verifies inventory and server-side pricing.
* `GET /api/customer/orders/my` - Customer's past orders (*Requires Bearer token*)
* `GET /api/customer/orders/:idOrNumber` - Order tracking details
* `POST /api/customer/orders/:id/cancel` - Cancel order if still in Pending/Processing state

#### 5. Reviews & Content
* `POST /api/customer/reviews` - Submit review and rating for a product
* `GET /api/customer/reviews/product/:productId` - List approved reviews
* `GET /api/customer/content/banners` - Active hero promotional banners
* `GET /api/customer/content/categories` - List of active gift categories
* `GET /api/customer/content/occasions` - List of active occasions
* `GET /api/customer/content/settings` - Public store metadata, contact info, and shipping rules

---

### Media Uploads (`/api/upload`)
* `POST /api/upload` - Single file multipart upload (field: `image`)
* `POST /api/upload/multiple` - Multiple file multipart upload (field: `images`)

---

## 📂 Project Architecture

```
RS-Gifts-backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection & reconnect logic
│   │   └── cloudinary.js         # Cloudinary configuration
│   ├── models/
│   │   ├── User.js               # Unified User & Admin authentication model
│   │   ├── Product.js            # Gift products & personalization schema
│   │   ├── Category.js           # Categories
│   │   ├── Occasion.js           # Occasions
│   │   ├── Order.js              # Order schema & lifecycle workflow
│   │   ├── Coupon.js             # Discount coupons
│   │   ├── Banner.js             # Promotional banners
│   │   ├── Review.js             # Ratings & reviews
│   │   └── Setting.js            # Store settings & shipping rules
│   ├── middlewares/
│   │   ├── authMiddleware.js     # JWT verification & role authorization
│   │   ├── errorMiddleware.js    # 404 & centralized error handler
│   │   ├── uploadMiddleware.js   # Multer file upload handler
│   │   └── validateMiddleware.js # Request validator
│   ├── services/
│   │   ├── orderService.js       # Pricing, stock management, coupon rules
│   │   └── cloudinaryService.js  # Cloudinary upload integration
│   ├── controllers/
│   │   ├── admin/                # 11 Dedicated Admin controllers
│   │   └── customer/             # 6 Dedicated Customer controllers
│   ├── routes/
│   │   ├── admin/                # Admin route modules
│   │   ├── customer/             # Customer route modules
│   │   ├── uploadRoutes.js       # File upload endpoints
│   │   └── index.js              # Master API router
│   ├── utils/
│   │   ├── generateToken.js      # JWT token helper
│   │   └── seeder.js             # Database seeder script
│   ├── app.js                    # Express app configuration
│   └── server.js                 # HTTP listener entrypoint
├── uploads/                      # Local uploaded media storage
├── .env.example                  # Environment template
├── .env                          # Local environment variables
└── package.json                  # Dependencies & scripts
```