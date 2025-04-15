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
app.get('/read', async (req, res) => {
    try {
        const db = client.db('FurnitureDB');
        const collection = db.collection('products');
        const { name, chatlieu, mausac, category, priceFrom, priceTo, image } = req.query;
        let query = { $or: [] };

        if (name) query.$or.push({ name: { $regex: name, $options: 'i' } });
        if (chatlieu) query.$or.push({ chatlieu: { $regex: chatlieu, $options: 'i' } });
        if (mausac) query.$or.push({ mausac: { $in: [mausac] } });
        if (category) query.$or.push({ id: { $regex: `^${category}`, $options: 'i' } });
        if (priceFrom || priceTo) {
            let priceQuery = {};
            if (priceFrom) priceQuery.$gte = parseInt(priceFrom.replace(/[^0-9]/g, ''));
            if (priceTo) priceQuery.$lte = parseInt(priceTo.replace(/[^0-9]/g, ''));
            if (Object.keys(priceQuery).length > 0) query.$or.push({ giaban: priceQuery });
        }
        if (image) query.$or.push({ image: { $regex: image, $options: 'i' } });

        // Nếu không có tiêu chí nào, trả về tất cả sản phẩm
        if (query.$or.length === 0) {
            query = {};
        }

        const products = await collection.find(query).toArray();
        if (products.length === 0) {
            return res.send('<p>Không có kết quả tìm kiếm</p>');
        }

        let html = '<table border="1"><tr><th>Mã</th><th>Tên</th><th>Giá bán</th><th>Chất liệu</th><th>Màu sắc</th><th>Kích thước</th><th>Hình ảnh</th></tr>';
        products.forEach(p => {
            html += `<tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.giaban}</td>
                <td>${p.chatlieu}</td>
                <td>${p.mausac.join(', ')}</td>
                <td>${p.kichthuoc.join(', ')}</td>
                <td><img src="/Images/${p.image}" width="100"></td>
            </tr>`;
        });
        html += '</table>';
        res.send(html);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`http://127.0.0.1:${port}`))