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
app.get('/read.html', (req, res) => {
    res.sendFile(__dirname + '/public/pages/read.html')
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

// Tìm kiếm sản phẩm (dùng OR)
// Tìm kiếm sản phẩm với bộ lọc
app.get('/search', async (req, res) => {
    try {
        const db = client.db('finalProject');
        const collection = db.collection('FurnitureDB');
        const { category, kichthuoc, mausac, chatlieu, priceFrom, priceTo, sortBy, page = 1, limit = 10 } = req.query;
        let query = {};

        // Xử lý bộ lọc loại sản phẩm (category)
        if (category) {
            const categories = category.split(',').filter(val => val);
            if (categories.length > 0) {
                query.id = { $regex: `^(${categories.join('|')})`, $options: 'i' };
            }
        }

        // Xử lý bộ lọc kích thước (kichthuoc)
        if (kichthuoc) {
            const sizes = kichthuoc.split(',').filter(val => val);
            if (sizes.length > 0) {
                query.kichthuoc = { $in: sizes };
            }
        }

        // Xử lý bộ lọc màu sắc (mausac)
        if (mausac) {
            const colors = mausac.split(',').filter(val => val);
            if (colors.length > 0) {
                query.mausac = { $in: colors };
            }
        }

        // Xử lý bộ lọc chất liệu (chatlieu)
        if (chatlieu) {
            const materials = chatlieu.split(',').filter(val => val);
            if (materials.length > 0) {
                query.chatlieu = { $in: materials };
            }
        }

        // Xử lý bộ lọc giá
        if (priceFrom || priceTo) {
            let priceQuery = {};
            if (priceFrom) priceQuery.$gte = parseInt(priceFrom.replace(/[^0-9]/g, ''));
            if (priceTo) priceQuery.$lte = parseInt(priceTo.replace(/[^0-9]/g, ''));
            if (Object.keys(priceQuery).length > 0) query.giaban = priceQuery;
        }

        // Sắp xếp
        let sortOption = {};
        if (sortBy === 'priceAsc') sortOption.giaban = 1;
        else if (sortBy === 'priceDesc') sortOption.giaban = -1;

        // Phân trang
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await collection
            .find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();

        const totalProducts = await collection.countDocuments(query);
        res.json({
            products,
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            currentPage: parseInt(page),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`http://127.0.0.1:${port}`))