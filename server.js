const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const GitAutoSave = require('./auto-git');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize auto-save
const gitAutoSave = new GitAutoSave('./uploads');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// API Routes

// Upload images
app.post('/api/upload', upload.array('images', 20), (req, res) => {
    try {
        console.log('📤 Upload request received');
        
        if (!req.files || req.files.length === 0) {
            console.error('❌ No files uploaded');
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const fileUrls = req.files.map(file => {
            console.log('✅ Uploaded:', file.filename);
            return {
                filename: file.filename,
                url: `/uploads/${file.filename}`,
                originalName: file.originalname
            };
        });

        res.json({ 
            success: true, 
            files: fileUrls,
            message: `${req.files.length} file(s) uploaded successfully`
        });

        // Trigger auto-save after 10 seconds
        console.log('⏰ Scheduling auto-save in 10 seconds...');
        setTimeout(() => {
            gitAutoSave.autoSave();
        }, 10000);

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all images
app.get('/api/images', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        });

        const images = imageFiles.map(file => ({
            filename: file,
            url: `/uploads/${file}`
        }));

        console.log('📸 Found', images.length, 'images');
        res.json({ success: true, images });
    } catch (error) {
        console.error('❌ Error fetching images:', error);
        res.status(500).json({ error: error.message });
    }
});

// Manual trigger for auto-save (optional endpoint)
app.post('/api/git-save', (req, res) => {
    console.log('🔄 Manual git-save triggered');
    gitAutoSave.autoSave();
    res.json({ success: true, message: 'Git auto-save triggered' });
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        images: fs.readdirSync(uploadsDir).length,
        autoSave: 'enabled',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
        error: 'Server error',
        message: error.message 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads folder: ${uploadsDir}`);
    console.log(`📸 Current images: ${fs.readdirSync(uploadsDir).length}`);
    
    // Start auto-save (every 5 minutes)
    gitAutoSave.startAutoSave(5);
    console.log('🔄 Auto-save to GitHub: ENABLED');
});
