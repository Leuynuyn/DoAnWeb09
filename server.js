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

app.listen(port, () => console.log(`http://127.0.0.1:${port}`))