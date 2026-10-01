import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Occasion from '../models/Occasion.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import Setting from '../models/Setting.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';

const initialCategories = [
  {
    name: 'Gifts',
    slug: 'gifts',
    description: 'Special gifts and thoughtful presents for every occasion',
    active: true,
    image: '',
  },
  {
    name: 'Personalized Gifts',
    slug: 'personalized-gifts',
    description: 'Customized mugs, frames, engraved items, and custom keepsakes',
    active: true,
    image: '',
  },
  {
    name: 'Home and Decor',
    slug: 'home-and-decor',
    description: 'Aesthetic lighting, decorative art, clocks, and home styling',
    active: true,
    image: '',
  },
  {
    name: 'Toys and Kids',
    slug: 'toys-and-kids',
    description: 'Creative toys, board games, learning gifts, and fun surprises for kids',
    active: true,
    image: '',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Wallets, wristwatches, jewelry, keychains, and lifestyle accessories',
    active: true,
    image: '',
  },
  {
    name: 'Flowers and Hampers',
    slug: 'flowers-and-hampers',
    description: 'Fresh flower arrangements, gourmet chocolate boxes, and luxury hampers',
    active: true,
    image: '',
  },
  {
    name: 'Birthday Gifts',
    slug: 'birthday-gifts',
    description: 'Memorable birthday surprises and celebratory presents for all ages',
    active: true,
    image: '',
  },
  {
    name: 'Anniversary Gifts',
    slug: 'anniversary-gifts',
    description: 'Romantic tokens, milestone gifts, and couple surprises',
    active: true,
    image: '',
  },
  {
    name: 'Festival Gifts',
    slug: 'festival-gifts',
    description: 'Festive gift hampers, sweets, lamps, and holiday season specials',
    active: true,
    image: '',
  },
  {
    name: 'Corporate Gifts',
    slug: 'corporate-gifts',
    description: 'Executive stationery, corporate gift sets, and employee appreciation packs',
    active: true,
    image: '',
  },
];

const initialOccasions = [
  { name: 'Birthday', slug: 'birthday', description: 'Birthday presents and surprises' },
  { name: 'Anniversary', slug: 'anniversary', description: 'Romantic and milestone anniversaries' },
  { name: 'Wedding', slug: 'wedding', description: 'Couple gifts and wedding tokens' },
  { name: 'Valentine\'s Day', slug: 'valentines-day', description: 'Romantic expressions of love' },
  { name: 'Diwali & Festivals', slug: 'diwali-festivals', description: 'Festive happiness and hampers' },
  { name: 'Corporate & Farewell', slug: 'corporate-farewell', description: 'Professional gifts & appreciations' },
];

const initialCoupons = [
  {
    code: 'WELCOME10',
    description: '10% off on your first purchase',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 499,
    maxDiscount: 150,
    active: true,
  },
  {
    code: 'FLAT100',
    description: 'Flat ₹100 discount on orders above ₹999',
    discountType: 'flat',
    discountValue: 100,
    minOrderValue: 999,
    active: true,
  },
];

const initialBanners = [
  {
    title: "More Than Gifts, It's Emotions",
    subtitle: 'Thoughtful gifts for every occasion. Because every moment deserves something special.',
    image: '/images/hero-banner-1.png',
    link: '/gifts',
    buttonText: 'Shop Now',
    position: 'hero',
    order: 1,
    active: true,
  },
  {
    title: 'Crafted With Love, Wrapped With Care',
    subtitle: 'Discover artisan chocolates, scented candles & bespoke gift baskets made to celebrate life’s moments.',
    image: '/images/hero-banner-2.jpg',
    link: '/hampers',
    buttonText: 'Explore Hampers',
    position: 'hero',
    order: 2,
    active: true,
  },
  {
    title: 'Personalized Gifts, Timeless Memories',
    subtitle: 'Engraved wooden keepsakes, photo treasures & heirloom gifts designed to tell your unique story.',
    image: '/images/hero-banner-3.jpg',
    link: '/personalized-gifts',
    buttonText: 'Personalize Now',
    position: 'hero',
    order: 3,
    active: true,
  },
  {
    title: 'Floral Whispers, Sweet Surprises',
    subtitle: 'Exquisite hand-tied pastel peonies, roses & artisanal macarons delivered fresh to your loved ones.',
    image: '/images/hero-banner-4.jpg',
    link: '/flowers-hampers',
    buttonText: 'Order Flowers',
    position: 'hero',
    order: 4,
    active: true,
  },
];

const initialProducts = [
  {
    title: 'Personalized Wooden Engraved Photo Frame',
    slug: 'personalized-wooden-engraved-photo-frame',
    sku: 'RS-FRAME-001',
    description: 'High-quality beech wood photo frame customized with your favorite couple or family photo and personal message.',
    category: 'Personalized Gifts',
    occasions: ['Anniversary', 'Birthday', 'Wedding'],
    price: 899,
    salePrice: 699,
    stock: 25,
    lowStockThreshold: 5,
    image: '',
    featured: true,
    active: true,
    personalization: {
      allowCustomText: true,
      customTextLabel: 'Couple Name & Anniversary Date (e.g. Rahul & Priya - 24.02.2024)',
      allowPhotoUpload: true,
      photoUploadRequired: true,
      allowGiftWrap: true,
      allowGreetingCard: true,
    },
  },
  {
    title: 'Customized Ceramic Magic Coffee Mug',
    slug: 'customized-ceramic-magic-coffee-mug',
    sku: 'RS-MUG-002',
    description: 'Heat-activated color changing ceramic coffee mug that reveals your custom picture when hot liquid is poured in.',
    category: 'Personalized Gifts',
    occasions: ['Birthday', 'Valentine\'s Day'],
    price: 499,
    salePrice: 399,
    stock: 40,
    lowStockThreshold: 8,
    image: '',
    featured: true,
    active: true,
    personalization: {
      allowCustomText: true,
      customTextLabel: 'Name or Sweet Message on Mug',
      allowPhotoUpload: true,
      photoUploadRequired: true,
      allowGiftWrap: true,
      allowGreetingCard: true,
    },
  },
  {
    title: 'Aesthetic Warm Glow Moon Lamp (16 Colors Remote)',
    slug: 'aesthetic-warm-glow-moon-lamp',
    sku: 'RS-LAMP-003',
    description: '3D printed rechargeable Moon night light with touch switch and wireless remote control for ambient home decor.',
    category: 'Home and Decor',
    occasions: ['Birthday', 'Anniversary', 'Housewarming'],
    price: 1299,
    salePrice: 999,
    stock: 15,
    lowStockThreshold: 4,
    image: '',
    featured: true,
    active: true,
    personalization: {
      allowCustomText: false,
      allowPhotoUpload: false,
      allowGiftWrap: true,
      allowGreetingCard: true,
    },
  },
  {
    title: 'Gourmet Chocolate & Dry Fruit Luxury Hamper',
    slug: 'gourmet-chocolate-dry-fruit-luxury-hamper',
    sku: 'RS-HAMPER-004',
    description: 'Deluxe velvet box packed with artisanal roasted dry fruits, gourmet Belgian chocolates, and a fragrant soy candle.',
    category: 'Flowers and Hampers',
    occasions: ['Diwali & Festivals', 'Corporate & Farewell', 'Wedding'],
    price: 1899,
    salePrice: 1599,
    stock: 12,
    lowStockThreshold: 3,
    image: '',
    featured: true,
    active: true,
    personalization: {
      allowCustomText: false,
      allowPhotoUpload: false,
      allowGiftWrap: true,
      allowGreetingCard: true,
    },
  },
];

const seedDatabase = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri === 'your_mongodb_connection_string_here') {
    console.error('\nERROR: CANNOT SEED DATABASE: MONGO_URI is missing or unconfigured in .env');
    console.error('Please configure your MONGO_URI connection string in .env and run "npm run seed" again.\n');
    process.exit(1);
  }

  try {
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || 'RSGIFTS',
      serverSelectionTimeoutMS: 8000,
    });
    console.log('Connected to MongoDB successfully.');

    // Clear existing collections if -d argument passed
    if (process.argv.includes('-d') || process.argv.includes('--destroy')) {
      console.log('Clearing existing data...');
      await User.deleteMany();
      await Product.deleteMany();
      await Category.deleteMany();
      await Occasion.deleteMany();
      await Coupon.deleteMany();
      await Banner.deleteMany();
      await Setting.deleteMany();
      await Order.deleteMany();
      await Review.deleteMany();
      console.log('Existing collections cleared.');
    }

    // 1. Seed Administrator
    await User.updateMany({ role: 'superadmin' }, { role: 'admin' });
    const existingAdmin = await User.findOne({ email: 'admin@rsgifts.com' });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@123', salt);

      await User.create({
        name: 'RS Gifts',
        email: 'admin@rsgifts.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+91 98765 43210',
        isActive: true,
      });
      console.log('Admin account seeded: admin@rsgifts.com / Admin@123');
    } else {
      existingAdmin.role = 'admin';
      await existingAdmin.save({ validateBeforeSave: false });
      console.log('Admin account already exists and role confirmed as admin (admin@rsgifts.com).');
    }

    // 2. Seed Default Settings
    const existingSetting = await Setting.findOne();
    if (!existingSetting) {
      await Setting.create({
        contactPhone: '',
        contactEmail: '',
        storeAddress: '',
        supportHours: '',
        currencySymbol: '₹',
        standardShippingFee: 50,
        freeShippingThreshold: 999,
        cashOnDeliveryEnabled: true,
        adminName: '',
        adminEmail: '',
      });
      console.log('Store settings initialized.');
    }

    // 3. Seed Categories
    for (const cat of initialCategories) {
      await Category.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true, new: true });
    }
    console.log(`${initialCategories.length} Categories seeded.`);

    // 4. Seed Occasions
    for (const occ of initialOccasions) {
      await Occasion.findOneAndUpdate({ slug: occ.slug }, occ, { upsert: true, new: true });
    }
    console.log(`${initialOccasions.length} Occasions seeded.`);

    // 5. Seed Coupons
    for (const coup of initialCoupons) {
      await Coupon.findOneAndUpdate({ code: coup.code }, coup, { upsert: true, new: true });
    }
    console.log(`${initialCoupons.length} Discount Coupons seeded.`);

    // 6. Seed Banners
    for (const ban of initialBanners) {
      const exists = await Banner.findOne({ title: ban.title });
      if (!exists) {
        await Banner.create(ban);
      }
    }
    console.log('Promotional banners seeded.');

    // 7. Seed Sample Products
    await Product.deleteMany({ slug: null });
    for (const prod of initialProducts) {
      const existing = await Product.findOne({ sku: prod.sku });
      if (existing) {
        Object.assign(existing, prod);
        await existing.save();
      } else {
        await Product.create(prod);
      }
    }
    console.log(`${initialProducts.length} Sample Gift Products seeded.`);

    console.log('\n======================================================');
    console.log('SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Default Admin: admin@rsgifts.com');
    console.log('Default Password: Admin@123');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
