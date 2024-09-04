var express = require('express');
var router = express.Router();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDb = require('../models/db.js');
const { ObjectId } = require('mongodb');


router.use(cors());

// GET home page
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// GET all products
router.get('/products', function(req, res) {
  connectDb()
    .then(db => {
      db.collection('products').find().toArray()
        .then(products => {
          res.json(products);
        })
        .catch(err => {
          console.error('Error fetching products:', err);
          res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm' });
        });
    })
    .catch(err => {
      console.error('Error connecting to database:', err);
      res.status(500).json({ message: 'Lỗi kết nối cơ sở dữ liệu' });
    });
});

// POST create a new product
router.post('/products', function(req, res) {
  connectDb()
    .then(db => {
      const product = req.body;
      db.collection('products').insertOne(product)
        .then(result => {
          res.status(201).json(result.ops[0]);
        })
        .catch(err => {
          console.error('Error inserting product:', err);
          res.status(500).json({ message: 'Lỗi khi thêm sản phẩm' });
        });
    })
    .catch(err => {
      console.error('Error connecting to database:', err);
      res.status(500).json({ message: 'Lỗi kết nối cơ sở dữ liệu' });
    });
});

// GET product detail by ID
router.get('/productdetail/:id', async (req, res, next) => {
  let id = new ObjectId(req.params.id);
  try {
    const db = await connectDb();
    const productCollection = db.collection('products');
    const product = await productCollection.findOne({ _id: id });
    if (product) {
      res.status(200).json(product);
    } else {
      res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
  } catch (error) {
    console.error('Error fetching product detail:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy chi tiết sản phẩm' });
  }
});

// GET search products by keyword
router.get('/search/:keyword', async (req, res, next) => {
  try {
    const db = await connectDb();
    const productCollection = db.collection('products');
    const products = await productCollection.find({ name: new RegExp(req.params.keyword, 'i') }).toArray();
    if (products.length > 0) {
      res.status(200).json(products);
    } else {
      res.status(404).json({ message: "Không tìm thấy sản phẩm nào" });
    }
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Lỗi server khi tìm kiếm sản phẩm' });
  }
});

// POST register a new user
router.post('/register', async (req, res) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const { email, password } = req.body;

  try {
    const user = await userCollection.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashPassword, role: 'user' };

    const result = await userCollection.insertOne(newUser);
    if (result.insertedId) {
      res.status(201).json({ message: "Đăng ký thành công" });
    } else {
      res.status(500).json({ message: "Đăng ký thất bại" });
    }
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

// POST login user
router.post('/login', async (req, res) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const { email, password } = req.body;
  
  try {
    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Mật khẩu không chính xác" });
    }
    
    const token = jwt.sign({ email: user.email, role: user.role }, 'secret', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

// GET check token validity
router.get('/checktoken', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(400).json({ message: "Token không được cung cấp" });
  }
  
  jwt.verify(token, 'secret', (err, user) => {
    if (err) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
    res.status(200).json({ message: "Token hợp lệ" });
  });
});





module.exports = router;
