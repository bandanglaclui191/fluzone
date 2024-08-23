var express = require('express');
var router = express.Router();
const cors = require('cors');
const bcrypt = require('bcryptjs');

const connectDb = require('../models/db.js');
const { ObjectId } = require('mongodb');

// Enable CORS for all routes
router.use(cors());

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/products', function(req, res) {
  connectDb()
    .then(db => {
      db.collection('products').find().toArray()
        .then(products => {
          res.json(products);
        })
        .catch(err => console.error(err));
    })
    .catch(err => console.error(err));
});

router.post('/products', function(req, res) {
  connectDb()
    .then(db => {
      const product = req.body;
      db.collection('products').insertOne(product)
        .then(result => {
          res.status(201).json(result.ops[0]);
        })
        .catch(err => console.error(err));
    })
    .catch(err => console.error(err));
});


router.get('/productdetail/:id', async(req, res, next)=> {
  let id = new ObjectId(req.params.id);
  const db=await connectDb();
  const productCollection=db.collection('products');
  const product=await productCollection.findOne({_id:id});
  if(product){
    res.status(200).json(product);
  }else{
    res.status(404).json({message : "Không tìm thấy"})
  }
}
);
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
    console.error("Error fetching products by search:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});
router.post('/register', async (req, res) => {
  const db = await connectDb();
  const userCollection = db.collection('users');
  const { email, password } = req.body;

  try {
    // Kiểm tra email đã tồn tại
    const user = await userCollection.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    // Mã hóa mật khẩu và tạo người dùng mới
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashPassword, role: 'user' };

    // Chèn người dùng vào cơ sở dữ liệu
    const result = await userCollection.insertOne(newUser);
    if (result.insertedId) {
      res.status(200).json({ message: "Đăng ký thành công" });
    } else {
      res.status(500).json({ message: "Đăng ký thất bại" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

module.exports = router;
