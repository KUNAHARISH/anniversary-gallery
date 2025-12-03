const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Only load auto-git in development
let GitAutoSave;
let gitAutoSave;

const isProduction = process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

if (!isProduction) {
    try {
        GitAutoSave = require('./auto-git');
        gitAutoSave = new GitAutoSave('./uploads');
    } catch (error) {
        console.log('⚠️ Auto-git module not loaded (production mode)');
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

        // Only trigger auto-save in development (local)
        if (!isProduction && gitAutoSave) {
            console.log('⏰ Scheduling auto-save in 10 seconds...');
            setTimeout(() => {
                gitAutoSave.autoSave();
            }, 10000);
        }

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

// Manual trigger for auto-save (development only)
app.post('/api/git-save', (req, res) => {
    if (!isProduction && gitAutoSave) {
        console.log('🔄 Manual git-save triggered');
        gitAutoSave.autoSave();
        res.json({ success: true, message: 'Git auto-save triggered' });
    } else {
        res.json({ 
            success: false, 
            message: 'Auto-save not available in production. Use download feature instead.' 
        });
    }
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    const imageCount = fs.readdirSync(uploadsDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    }).length;

    res.json({ 
        status: 'OK',
        environment: isProduction ? 'production' : 'development',
        images: imageCount,
        autoSave: isProduction ? 'disabled' : 'enabled',
        interval: '2 minutes',
        storage: isProduction ? 'temporary (ephemeral)' : 'permanent (local)',
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
    console.log('='.repeat(60));
    console.log('🎉 Anniversary Gallery - Sri Sivani Engineering College');
    console.log('='.repeat(60));
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads folder: ${uploadsDir}`);
    console.log(`📸 Current images: ${fs.readdirSync(uploadsDir).length}`);
    console.log(`🌐 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    
    if (!isProduction && gitAutoSave) {
        gitAutoSave.startAutoSave(2);
        console.log('🔄 Auto-save to GitHub: ENABLED (Every 2 minutes)');
        console.log('💾 Storage: Permanent (local files + GitHub)');
    } else {
        console.log('🔄 Auto-save to GitHub: DISABLED (Production mode)');
        console.log('💾 Storage: Temporary (ephemeral - resets on restart)');
        console.log('💡 Tip: Download photos as PDF to save permanently');
    }
    
    console.log('='.repeat(60));
    console.log('✅ Ready for anniversary event!');
    console.log('📱 Share URL with everyone to upload photos');
    console.log('='.repeat(60));
});
