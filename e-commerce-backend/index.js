const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json());
app.use(cors());

// Database Connection With MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://krishnachitturi55:balubalu@cluster0.cq9u1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.error("MongoDB connection error: ", err);
});

// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `https://ecommerce-frontend1-ztpf.onrender.com/images/${req.file.filename}`
    });
});

app.use('/images', express.static('upload/images'));

// MiddleWare to fetch user from database using JWT
const fetchuser = async (req, res, next) => {
    const token = req.header("auth-token");
    if (!token) {
        return res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
    try {
        const secret = process.env.JWT_SECRET || "secret_ecom";
        const data = jwt.verify(token, secret);
        req.user = data.user;
        console.log("User authenticated: ", req.user);
        next();
    } catch (error) {
        console.log("Token verification failed: ", error);
        return res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
};

// Schema for creating user model
const Users = mongoose.model("Users", new mongoose.Schema({
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    cartData: { type: Object },
    date: { type: Date, default: Date.now }
}));

// Schema for creating Product
const Product = mongoose.model("Product", new mongoose.Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    new_price: { type: Number },
    old_price: { type: Number },
    date: { type: Date, default: Date.now },
    available: { type: Boolean, default: true }
}));

app.get("/", (req, res) => {
    res.send("Root");
});

// Login user and give auth-token
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await Users.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(400).json({ success: false, errors: "Invalid email or password" });
        }
        const token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET || 'secret_ecom');
        res.json({ success: true, token });
    } catch (error) {
        console.error("Login error: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Sign up and register user in database & send token
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        let existingUser = await Users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, errors: "User with this email already exists" });
        }

        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }

        const user = new Users({
            name: username,
            email,
            password,
            cartData: cart
        });
        await user.save();
        const token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET || 'secret_ecom');
        res.json({ success: true, token });
    } catch (error) {
        console.error("Sign up error: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Get all products
app.get("/allproducts", async (req, res) => {
    try {
        let products = await Product.find({});
        res.send(products);
    } catch (error) {
        console.error("Error fetching products: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Get new collections
app.get("/newcollections", async (req, res) => {
    try {
        let products = await Product.find({});
        let newCollections = products.slice(-8);  // Get last 8 products
        res.send(newCollections);
    } catch (error) {
        console.error("Error fetching new collections: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Get popular in women
app.get("/popularinwomen", async (req, res) => {
    try {
        let products = await Product.find({});
        let popularProducts = products.slice(0, 4);  // Get first 4 products
        res.send(popularProducts);
    } catch (error) {
        console.error("Error fetching popular in women: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Add product to cart
app.post('/addtocart', fetchuser, async (req, res) => {
    try {
        let user = await Users.findById(req.user.id);
        user.cartData[req.body.itemId] = (user.cartData[req.body.itemId] || 0) + 1;
        await user.save();
        res.send("Added to cart");
    } catch (error) {
        console.error("Error adding to cart: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Remove product from cart
app.post('/removefromcart', fetchuser, async (req, res) => {
    try {
        let user = await Users.findById(req.user.id);
        if (user.cartData[req.body.itemId] > 0) {
            user.cartData[req.body.itemId] -= 1;
        }
        await user.save();
        res.send("Removed from cart");
    } catch (error) {
        console.error("Error removing from cart: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Get user cart
app.post('/getcart', fetchuser, async (req, res) => {
    try {
        let user = await Users.findById(req.user.id);
        res.json(user.cartData);
    } catch (error) {
        console.error("Error fetching cart: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Add a new product
app.post("/addproduct", async (req, res) => {
    try {
        let products = await Product.find({});
        let lastId = products.length ? products[products.length - 1].id : 0;
        const product = new Product({
            id: lastId + 1,
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            new_price: req.body.new_price,
            old_price: req.body.old_price,
        });
        await product.save();
        res.json({ success: true, name: req.body.name });
    } catch (error) {
        console.error("Error adding product: ", error);
        res.status(500).send("Internal Server Error");
    }
});

// Remove a product
app.post("/removeproduct", async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.body.id });
        res.json({ success: true });
    } catch (error) {
        console.error("Error removing product: ", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, (error) => {
    if (!error) console.log("Server Running on port " + port);
    else console.log("Error: ", error);
});
