const express = require('express');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express()
const port = 3000

//Chuỗi kết nối MongoDB Atlas
const uri = 'mongodb+srv://admin1:nJyLfu03HqgaqPD1@cluster0furnituredb.7pxvcik.mongodb.net/';
const client = new MongoClient(uri);

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// cấu hình multer để tải file json

//Kết nối MongoDB Atlaa
async function connectDB() {
    try {
        await client.connect();
        console.log("Đã kết nối với MongoDB Atlas!!!");
    } catch (err) {
        console.error('Lỗi kết nối MongoDB Atlas', err);
    }
}
connectDB();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/pages/home.html')
})
app.get('/list.html', (req, res) => {
    res.sendFile(__dirname + '/public/pages/list.html')
});
app.get('/product-detail.html', (req, res) => {
    res.sendFile(__dirname + '/public/pages/product-detail.html')
});
//Lay danh sách sản phẩm
app.get('/list', async (req, res) => {
    try {
        const db = client.db('finalProject');
        const collection = db.collection('FurnitureDB');
        const {sortBy, image, page = 1, limit = 10} = req.query;
        let query = {};
        let sortOption = {};  

        if (image) query.image = {$regex: image, $options: 'i'};
        if (sortBy === 'idAsc') sortOption = {id: 1};
        else if (sortBy === 'idDesc') sortOption = {id: -1};
        else if (sortBy === 'newest') sortOption.createdAt = -1;        

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await collection.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
        
        const totalProducts = await collection.countDocuments(query);
        res.json({
            products,
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ error: err.message });
    }
});

//Lấy chi tiết sản phẩm
app.get('/product/:id', async (req, res) => {
    try {
        const db = client.db('finalProject');
        const collection = db.collection('FurnitureDB');
        const product = await collection.findOne({ id: req.params.id });
        if(!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: err.message });
    }
});


// ------------------- API Tìm kiếm sản phẩm --------------------

app.get('/update.html', (req, res) => {
    res.sendFile(__dirname + '/public/pages/update.html')
});

// Tìm kiếm 
// Hàm xóa dấu tiếng Việt
function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

app.get('/search', async (req, res) => {
    try {
        const db = client.db('finalProject');
        const collection = db.collection('FurnitureDB');

        const { id, name, limit = 15 } = req.query;
        const allResults = await collection.find({})
            .project({ id: 1, name: 1 })
            .toArray();

        const normalizedId = id ? id.trim().toLowerCase() : null;
        const normalizedName = name ? removeDiacritics(name.trim().toLowerCase()) : null;

        const filtered = allResults.filter(product => {
            const productId = product.id?.toLowerCase() || "";
            const productName = removeDiacritics(product.name?.toLowerCase() || "");

            const idMatch = normalizedId ? productId.includes(normalizedId) : true;
            const nameMatch = normalizedName ? productName.includes(normalizedName) : true;

            return idMatch && nameMatch;
        });

        res.json(filtered.slice(0, parseInt(limit)));

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});



// ------------------- API Cập nhật sản phẩm --------------------
// Lấy thông tin sản phẩm theo ID
app.get('/getProductById', async (req, res) => {
    try {
      const db = client.db('finalProject');
      const collection = db.collection('FurnitureDB');
      const { id } = req.query;
      const product = await collection.findOne({ id: id });
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ error: 'Không tìm thấy sản phẩm với ID này.' });
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin sản phẩm:', err);
      res.status(500).json({ error: err.message });
    }
  });
  

// Cập nhật sản phẩm
const upload = multer({ dest: 'public/Images/' }); // Thư mục lưu trữ ảnh
app.post('/updateProduct', upload.single('image'), async (req, res) => {
  try {
    const db = client.db('finalProject');
    const collection = db.collection('FurnitureDB');
    const { id, name, giaban, giagoc, chatlieu, mausac, kichthuoc, motasanpham } = req.body;
    const updateData = {
      name: name,
      giaban: giaban,
      giagoc: giagoc,
      chatlieu: chatlieu,
      mausac: mausac.split(', '),
      kichthuoc: kichthuoc.split(', '),
      motasanpham: motasanpham,
    };
    if (req.file) {
      updateData.image = req.file.filename; // Lưu tên file ảnh mới
    }
    const result = await collection.updateOne(
      { id: id },
      { $set: updateData }
    );
    if (result.modifiedCount > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error('Lỗi khi cập nhật sản phẩm:', err);
    res.status(500).json({ error: err.message });
  }
});



// ------------------- API Xóa sản phẩm --------------------

app.get('/delete.html', (req, res) => {
  res.sendFile(__dirname + '/public/pages/delete.html')
});

app.delete('/deleteProducts', async (req, res) => {
  try {
    const db = client.db('finalProject');
    const collection = db.collection('FurnitureDB');
    const { ids } = req.body; // Nhận danh sách các ID cần xóa
    const result = await collection.deleteMany({ id: { $in: ids } });
    if (result.deletedCount > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error('Lỗi khi xoá sản phẩm:', err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(port, () => console.log(`http://127.0.0.1:${port}`))