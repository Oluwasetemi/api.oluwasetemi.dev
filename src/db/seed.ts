import { seed } from "drizzle-seed";

import db from ".";
import { posts, products, tasks } from "./schema";

const cloudinaryImages = [
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861198/npqjtukxdgxdaznqmkba.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861199/ftxu6nndtbmhjjtgg7qm.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861201/bibdlbgun6z3avuzv9ok.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861202/gbxa63igcnxz8gittyty.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861204/cuauqhkqxz8knc4ouwnt.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861205/mxjvolhtsw4szqvizyhm.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861207/aqb41obhsyrpauk9rqt4.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861208/rh0lrdodw5vc79gxgaz6.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861209/nn34z5qt6irpggiqm6ta.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861210/tl0f3cyxgcwslchgs75u.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861211/f5csubwzgazrswndyfmr.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861213/rawuyekjhlpd5wybsiie.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1763861214/ii7jfsmkgww8j90vjf0g.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1612780836/sickfits/oe7ai6zs7osuhivstfpf.png",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1604198925/sickfits/k4idwidhgxmx1utsecwt.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1593196500/sickfits/nmlpylmz1srwgqami7g8.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1588201999/sickfits/w8jcyeraduhbzpqbs0qs.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1588201726/sickfits/tdq3eyibchl36jdbztdv.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1588200983/sickfits/aqb5bc1mabwpapfwpmx9.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1588200785/sickfits/kdaosombwihummfeshgx.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1588199524/sickfits/r7zh6jp2uhdg0ghaexiy.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1586697681/sickfits/guvi3uccoy44ljyeie4e.jpg",
  "http://res.cloudinary.com/drnqdd87d/image/upload/v1586697636/sickfits/qp8uf4d6f1cc6tvznkka.jpg",
];

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");

  if (shouldReset) {
    console.warn("🗑️  Resetting database...");
    try {
      await db.delete(tasks);
      await db.delete(products);
      await db.delete(posts);
      console.warn("✅ Database reset successful!");
    }
    catch (error) {
      console.error("❌ Error resetting database:", error);
      process.exit(1);
    }
  }

  console.warn("🌱 Starting to seed 500 tasks, 500 products, and 500 posts...");

  await seed(db as any, { tasks, products, posts }).refine(f => ({
    tasks: {
      count: 500,
      columns: {
        id: f.string({ isUnique: true }),
        name: f.weightedRandom([
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "Complete project documentation",
                "Review pull requests",
                "Update dependencies",
                "Write unit tests",
                "Fix bug in authentication",
                "Optimize database queries",
                "Deploy to staging",
                "Code review for team",
                "Update API documentation",
                "Implement new feature",
                "Refactor legacy code",
                "Set up monitoring",
                "Configure CI/CD pipeline",
                "Security audit",
                "Performance testing",
                "User acceptance testing",
                "Backup database",
                "Update SSL certificates",
                "Monitor system resources",
                "Debug production issue",
              ],
            }),
          },
          {
            weight: 0.4,
            value: f.valuesFromArray({
              values: [
                "Call client about requirements",
                "Schedule team meeting",
                "Prepare presentation slides",
                "Update project timeline",
                "Review budget allocation",
                "Coordinate with stakeholders",
                "Plan sprint activities",
                "Update status reports",
                "Follow up on emails",
                "Organize team event",
                "Update process documentation",
                "Conduct user interviews",
                "Analyze competitor data",
                "Prepare quarterly review",
                "Coordinate with vendors",
                "Update risk assessment",
                "Plan training sessions",
                "Review compliance requirements",
                "Update marketing materials",
                "Organize workshop",
              ],
            }),
          },
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "Buy groceries",
                "Clean apartment",
                "Pay utility bills",
                "Schedule dentist appointment",
                "Book flight tickets",
                "Renew insurance policy",
                "Organize closet",
                "Plan weekend trip",
                "Call family members",
                "Update resume",
                "Research new restaurants",
                "Plan birthday party",
                "Fix household items",
                "Update emergency contacts",
                "Plan workout routine",
                "Organize digital files",
                "Update personal budget",
                "Plan vacation itinerary",
                "Schedule car maintenance",
                "Update personal goals",
              ],
            }),
          },
        ]),
        description: f.weightedRandom([
          {
            weight: 0.4,
            value: f.valuesFromArray({
              values: [
                "Complete the task as soon as possible",
                "This needs to be done by the end of the week",
                "High priority item that requires attention",
                "Standard task with normal priority",
                "Routine maintenance task",
                "Quick fix that should be simple",
                "Important feature that needs testing",
                "Bug fix that was reported by users",
                "Documentation update required",
                "Performance improvement needed",
                "Security update for the system",
                "User interface enhancement",
                "Database optimization task",
                "API endpoint modification",
                "Mobile app feature update",
              ],
            }),
          },
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "High priority task that needs immediate attention",
                "This task is part of the current sprint",
                "Blocked by external dependency",
                "Requires approval from stakeholders",
                "Needs to be completed before the deadline",
                "This is a recurring task",
                "Depends on other team members",
                "Requires additional research",
                "Part of the technical debt cleanup",
                "Customer-facing feature",
                "Internal tool improvement",
                "Security-related task",
                "Performance optimization needed",
                "Documentation update required",
                "Testing and validation needed",
              ],
            }),
          },
          {
            weight: 0.3,
            value: f.default({ defaultValue: "" }),
          },
        ]),
        priority: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: "HIGH" }) },
          { weight: 0.5, value: f.default({ defaultValue: "MEDIUM" }) },
          { weight: 0.3, value: f.default({ defaultValue: "LOW" }) },
        ]),
        status: f.weightedRandom([
          { weight: 0.4, value: f.default({ defaultValue: "TODO" }) },
          { weight: 0.3, value: f.default({ defaultValue: "IN_PROGRESS" }) },
          { weight: 0.2, value: f.default({ defaultValue: "DONE" }) },
          { weight: 0.1, value: f.default({ defaultValue: "CANCELLED" }) },
        ]),
        start: f.weightedRandom([
          {
            weight: 0.6,
            value: f.date({
              minDate: "2024-01-01",
              maxDate: "2024-12-31",
            }),
          },
          {
            weight: 0.4,
            value: f.default({ defaultValue: null }),
          },
        ]),
        end: f.weightedRandom([
          {
            weight: 0.5,
            value: f.date({
              minDate: "2024-01-01",
              maxDate: "2024-12-31",
            }),
          },
          {
            weight: 0.5,
            value: f.default({ defaultValue: null }),
          },
        ]),
        duration: f.weightedRandom([
          {
            weight: 0.3,
            value: f.int({ minValue: 30, maxValue: 120 }), // 30-120 minutes
          },
          {
            weight: 0.4,
            value: f.int({ minValue: 240, maxValue: 480 }), // 4-8 hours
          },
          {
            weight: 0.2,
            value: f.int({ minValue: 1440, maxValue: 2880 }), // 1-2 days
          },
          {
            weight: 0.1,
            value: f.default({ defaultValue: null }),
          },
        ]),
        archived: f.weightedRandom([
          { weight: 0.9, value: f.default({ defaultValue: false }) },
          { weight: 0.1, value: f.default({ defaultValue: true }) },
        ]),
        is_default: f.default({ defaultValue: true }),
        owner: f.default({ defaultValue: null }),
        tags: f.weightedRandom([
          {
            weight: 0.6,
            value: f.valuesFromArray({
              values: [
                "frontend,urgent",
                "backend,feature",
                "bug,high-priority",
                "documentation,low-priority",
                "testing,medium-priority",
                "deployment,urgent",
                "refactoring,tech-debt",
                "security,high-priority",
                "performance,optimization",
                "ui/ux,feature",
                "api,integration",
                "database,migration",
                "mobile,feature",
                "analytics,reporting",
                "automation,ci/cd",
              ],
            }),
          },
          {
            weight: 0.4,
            value: f.default({ defaultValue: null }),
          },
        ]),
        completedAt: f.weightedRandom([
          {
            weight: 0.2,
            value: f.date({
              minDate: "2024-01-01",
              maxDate: "2024-12-31",
            }),
          },
          {
            weight: 0.8,
            value: f.default({ defaultValue: null }),
          },
        ]),
        children: f.default({ defaultValue: "[]" }),
        parentId: f.default({ defaultValue: null }),
      },
    },
    products: {
      count: 500,
      columns: {
        id: f.string({ isUnique: true }),
        name: f.weightedRandom([
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "Premium Wireless Headphones",
                "Ultra HD Smart TV 55 inch",
                "Gaming Laptop Pro 2024",
                "Ergonomic Office Chair Deluxe",
                "Mechanical Keyboard RGB",
                "Wireless Gaming Mouse",
                "Portable SSD 1TB",
                "USB-C Hub 7-in-1",
                "4K Webcam Pro",
                "Standing Desk Electric",
                "Monitor 27 inch 4K",
                "Graphics Card RTX 4070",
                "CPU Cooler RGB Tower",
                "Power Supply 750W Modular",
                "Gaming Mouse Pad XXL",
                "Cable Management Kit",
                "Desk Lamp LED Adjustable",
                "Bluetooth Speaker Portable",
                "Smartphone Stand Adjustable",
                "Laptop Cooling Pad Silent",
              ],
            }),
          },
          {
            weight: 0.4,
            value: f.valuesFromArray({
              values: [
                "Cotton T-Shirt Classic Fit",
                "Denim Jeans Slim Fit",
                "Leather Jacket Premium",
                "Running Shoes Pro Performance",
                "Casual Sneakers Canvas",
                "Winter Coat Waterproof",
                "Summer Dress Floral",
                "Business Suit Two-Piece",
                "Polo Shirt Cotton",
                "Hoodie Comfortable Fleece",
                "Baseball Cap Adjustable",
                "Sunglasses UV Protection",
                "Leather Belt Genuine",
                "Backpack Travel 40L",
                "Wallet Genuine Leather RFID",
                "Smartwatch Fitness Tracker",
                "Scarf Wool Cashmere",
                "Gloves Winter Touchscreen",
                "Socks Athletic Cushioned",
                "Underwear Premium Cotton Pack",
              ],
            }),
          },
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "Coffee Maker Automatic Drip",
                "Blender High Speed 1200W",
                "Air Fryer XL 5.8 Quart",
                "Microwave Oven 1.2 Cu Ft",
                "Toaster 4 Slice Stainless",
                "Electric Kettle Glass 1.7L",
                "Food Processor 12 Cup",
                "Stand Mixer 6 Quart",
                "Rice Cooker Fuzzy Logic",
                "Slow Cooker 6 Quart Digital",
                "Juicer Cold Press Masticating",
                "Espresso Machine 15 Bar",
                "Water Filter Pitcher 10 Cup",
                "Kitchen Scale Digital 11lb",
                "Knife Set Professional 15-Piece",
                "Cutting Board Bamboo Set",
                "Cookware Set Non-Stick 10-Piece",
                "Baking Sheet Set 3-Piece",
                "Storage Containers Glass Set",
                "Dish Rack Stainless Steel Large",
              ],
            }),
          },
        ]),
        description: f.weightedRandom([
          {
            weight: 0.5,
            value: f.valuesFromArray({
              values: [
                "High-quality product with premium materials and excellent craftsmanship. Perfect for everyday use with modern design.",
                "Durable construction built to last with warranty included. Professional grade quality at an affordable price.",
                "Sleek and stylish design that complements any space. Energy efficient with eco-friendly materials.",
                "Easy to use with intuitive controls and features. Compact design perfect for small spaces.",
                "Advanced technology for superior performance. Versatile product suitable for multiple purposes.",
                "Premium features at competitive pricing. Designed for comfort and long-lasting durability.",
                "Industry-leading performance and reliability. Innovative design with practical functionality.",
                "High-performance solution for demanding tasks. Best-selling product with thousands of positive reviews.",
                "Limited edition design with exclusive features. Handcrafted with attention to detail and quality.",
                "Award-winning design recognized by industry experts. Sustainable and environmentally responsible product.",
              ],
            }),
          },
          {
            weight: 0.3,
            value: f.valuesFromArray({
              values: [
                "Made from premium imported materials with excellent quality control standards.",
                "Ergonomically designed for maximum comfort during extended use sessions.",
                "Weather-resistant and built for outdoor use in various conditions.",
                "Smart technology integration for modern convenience and connectivity.",
                "Professional-grade construction and materials for serious users.",
                "Lightweight yet incredibly durable design for portability.",
                "Multi-functional with various use cases for different needs.",
                "Easy maintenance and cleaning required for hassle-free ownership.",
                "Compatible with wide range of accessories and add-ons.",
                "Backed by excellent customer support and comprehensive warranty.",
              ],
            }),
          },
          {
            weight: 0.2,
            value: f.default({ defaultValue: "" }),
          },
        ]),
        price: f.weightedRandom([
          { weight: 0.3, value: f.int({ minValue: 999, maxValue: 4999 }) },
          { weight: 0.4, value: f.int({ minValue: 5000, maxValue: 19999 }) },
          { weight: 0.2, value: f.int({ minValue: 20000, maxValue: 99999 }) },
          { weight: 0.1, value: f.int({ minValue: 100000, maxValue: 499999 }) },
        ]),
        compareAtPrice: f.weightedRandom([
          { weight: 0.4, value: f.int({ minValue: 6000, maxValue: 35000 }) },
          { weight: 0.6, value: f.default({ defaultValue: null }) },
        ]),
        sku: f.string({ isUnique: true }),
        barcode: f.weightedRandom([
          { weight: 0.7, value: f.number({ minValue: 1000000000000, maxValue: 9999999999999, precision: 0 }) },
          { weight: 0.3, value: f.default({ defaultValue: null }) },
        ]),
        quantity: f.weightedRandom([
          { weight: 0.3, value: f.int({ minValue: 0, maxValue: 5 }) },
          { weight: 0.4, value: f.int({ minValue: 10, maxValue: 50 }) },
          { weight: 0.2, value: f.int({ minValue: 100, maxValue: 500 }) },
          { weight: 0.1, value: f.int({ minValue: 1000, maxValue: 5000 }) },
        ]),
        category: f.weightedRandom([
          { weight: 0.25, value: f.default({ defaultValue: "Electronics" }) },
          { weight: 0.25, value: f.default({ defaultValue: "Clothing" }) },
          { weight: 0.20, value: f.default({ defaultValue: "Home & Kitchen" }) },
          { weight: 0.15, value: f.default({ defaultValue: "Sports & Outdoors" }) },
          { weight: 0.15, value: f.default({ defaultValue: "Books & Media" }) },
        ]),
        tags: f.weightedRandom([
          {
            weight: 0.7,
            value: f.valuesFromArray({
              values: [
                "bestseller,featured",
                "new-arrival,trending",
                "sale,clearance",
                "premium,luxury",
                "eco-friendly,sustainable",
                "limited-edition,exclusive",
                "popular,top-rated",
                "budget-friendly,value",
                "professional,pro-grade",
                "seasonal,holiday",
                "handmade,artisan",
                "imported,international",
                "organic,natural",
                "tech,innovation",
                "classic,timeless",
              ],
            }),
          },
          { weight: 0.3, value: f.default({ defaultValue: null }) },
        ]),
        images: f.valuesFromArray({
          values: cloudinaryImages.map(img => `["${img}"]`),
        }),
        featured: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: true }) },
          { weight: 0.8, value: f.default({ defaultValue: false }) },
        ]),
        published: f.weightedRandom([
          { weight: 0.9, value: f.default({ defaultValue: true }) },
          { weight: 0.1, value: f.default({ defaultValue: false }) },
        ]),
        isDefault: f.default({ defaultValue: true }),
        owner: f.default({ defaultValue: null }),
      },
    },
    posts: {
      count: 500,
      columns: {
        id: f.string({ isUnique: true }),
        title: f.weightedRandom([
          {
            weight: 0.25,
            value: f.valuesFromArray({
              values: [
                "Getting Started with TypeScript",
                "Introduction to React Hooks",
                "Understanding GraphQL Subscriptions",
                "Building REST APIs with Hono",
                "Database Design Best Practices",
                "Modern Authentication Patterns",
                "WebSocket Real-time Communication",
                "Microservices Architecture Guide",
              ],
            }),
          },
          {
            weight: 0.25,
            value: f.valuesFromArray({
              values: [
                "10 Tips for Better Code Reviews",
                "Security Best Practices 2025",
                "Performance Optimization Techniques",
                "Testing Strategies for Web Apps",
                "API Documentation Standards",
                "Git Workflow Best Practices",
                "Containerization with Docker",
                "CI/CD Pipeline Setup Guide",
              ],
            }),
          },
          {
            weight: 0.25,
            value: f.valuesFromArray({
              values: [
                "Advanced TypeScript Patterns",
                "React Performance Deep Dive",
                "Database Indexing Strategies",
                "OAuth 2.0 Implementation Guide",
                "WebSocket vs Server-Sent Events",
                "Caching Strategies Explained",
                "Load Balancing Techniques",
                "Monitoring and Observability",
              ],
            }),
          },
          {
            weight: 0.25,
            value: f.valuesFromArray({
              values: [
                "Building Scalable Applications",
                "Serverless Architecture Guide",
                "Event-Driven Design Patterns",
                "API Rate Limiting Strategies",
                "Data Migration Best Practices",
                "Error Handling in Production",
                "Debugging Complex Systems",
                "Code Quality Metrics",
              ],
            }),
          },
        ]),
        slug: f.default({ defaultValue: null }), // Will be auto-generated from title
        content: f.weightedRandom([
          {
            weight: 0.3,
            value: f.loremIpsum({ sentencesCount: 50 }),
          },
          {
            weight: 0.4,
            value: f.loremIpsum({ sentencesCount: 30 }),
          },
          {
            weight: 0.2,
            value: f.loremIpsum({ sentencesCount: 100 }),
          },
          {
            weight: 0.1,
            value: f.loremIpsum({ sentencesCount: 200 }),
          },
        ]),
        excerpt: f.weightedRandom([
          {
            weight: 0.7,
            value: f.loremIpsum({ sentencesCount: 2 }),
          },
          {
            weight: 0.3,
            value: f.default({ defaultValue: null }),
          },
        ]),
        featured_image: f.weightedRandom([
          {
            weight: 0.6,
            value: f.valuesFromArray({
              values: cloudinaryImages,
            }),
          },
          {
            weight: 0.4,
            value: f.default({ defaultValue: null }),
          },
        ]),
        status: f.weightedRandom([
          { weight: 0.7, value: f.default({ defaultValue: "PUBLISHED" }) },
          { weight: 0.2, value: f.default({ defaultValue: "DRAFT" }) },
          { weight: 0.1, value: f.default({ defaultValue: "ARCHIVED" }) },
        ]),
        category: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: "Technology" }) },
          { weight: 0.2, value: f.default({ defaultValue: "Development" }) },
          { weight: 0.15, value: f.default({ defaultValue: "Tutorial" }) },
          { weight: 0.15, value: f.default({ defaultValue: "Best Practices" }) },
          { weight: 0.15, value: f.default({ defaultValue: "Architecture" }) },
          { weight: 0.15, value: f.default({ defaultValue: null }) },
        ]),
        tags: f.weightedRandom([
          {
            weight: 0.7,
            value: f.valuesFromArray({
              values: [
                "typescript,programming",
                "react,frontend",
                "nodejs,backend",
                "database,sql",
                "api,rest",
                "graphql,api",
                "websocket,realtime",
                "security,authentication",
                "testing,quality",
                "performance,optimization",
                "docker,containers",
                "ci/cd,automation",
                "microservices,architecture",
                "serverless,cloud",
                "monitoring,observability",
              ],
            }),
          },
          { weight: 0.3, value: f.default({ defaultValue: null }) },
        ]),
        view_count: f.weightedRandom([
          { weight: 0.3, value: f.int({ minValue: 0, maxValue: 100 }) },
          { weight: 0.4, value: f.int({ minValue: 100, maxValue: 1000 }) },
          { weight: 0.2, value: f.int({ minValue: 1000, maxValue: 10000 }) },
          { weight: 0.1, value: f.int({ minValue: 10000, maxValue: 100000 }) },
        ]),
        publishedAt: f.weightedRandom([
          {
            weight: 0.7,
            value: f.timestamp(),
          },
          { weight: 0.3, value: f.default({ defaultValue: null }) },
        ]),
        isDefault: f.default({ defaultValue: true }),
        author: f.default({ defaultValue: null }),
      },
    },
  }));

  console.warn("✅ Successfully seeded 500 tasks, 500 products, and 500 posts!");
  console.warn("🔒 All tasks, products, and posts marked as default (protected from deletion)");
  console.warn("🖼️  All products and posts have Cloudinary images assigned");
}

main().catch((error) => {
  console.error("❌ Error seeding database:", error);
  process.exit(1);
});
