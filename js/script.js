let galleryImages = [];
let currentModalIndex = 0;
const API_URL = window.location.origin;

const imageUpload = document.getElementById('imageUpload');
const gallery = document.getElementById('gallery');
const emptyState = document.getElementById('emptyState');
const downloadBtn = document.getElementById('downloadPDF');
const selectAllBtn = document.getElementById('selectAll');
const photoCount = document.getElementById('photoCount');
const loadingOverlay = document.getElementById('loadingOverlay');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');

// View toggle
const viewBtns = document.querySelectorAll('.view-btn');
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const view = btn.dataset.view;
        gallery.className = `gallery-grid view-${view}`;
    });
});

// Load existing images
window.addEventListener('load', loadExistingImages);

async function loadExistingImages() {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/api/images`);
        const data = await response.json();
        
        if (data.success && data.images.length > 0) {
            galleryImages = data.images;
            refreshGallery();
        }
    } catch (error) {
        console.error('Error loading images:', error);
    } finally {
        showLoading(false);
    }
}

// Handle image upload
imageUpload.addEventListener('change', async function(e) {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach(file => {
        formData.append('images', file);
    });

    showLoading(true);

    try {
        const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            data.files.forEach(file => {
                galleryImages.push(file);
            });
            refreshGallery();
            showNotification(`${data.files.length} photo(s) uploaded successfully!`, 'success');
        } else {
            showNotification('Upload failed: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error uploading images:', error);
        showNotification('Error uploading images. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
    
    imageUpload.value = '';
});

/// Replace the addImageToGallery function with this version (NO DELETE BUTTON)
function addImageToGallery(imageData, index) {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    galleryItem.dataset.index = index;
    
    const img = document.createElement('img');
    img.src = `${API_URL}${imageData.url}`;
    img.alt = `Anniversary Photo ${index + 1}`;
    img.loading = 'lazy';
    
    // Click to open modal
    img.addEventListener('click', () => openModal(index));
    
    const overlay = document.createElement('div');
    overlay.className = 'gallery-item-overlay';
    
    const info = document.createElement('div');
    info.className = 'gallery-item-info';
    info.innerHTML = `
        <i class="fas fa-image"></i>
        <span>Photo ${index + 1}</span>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'gallery-item-actions';
    
    const downloadImgBtn = document.createElement('button');
    downloadImgBtn.className = 'action-btn';
    downloadImgBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadImgBtn.title = 'Download Photo';
    downloadImgBtn.onclick = (e) => {
        e.stopPropagation();
        downloadSingleImage(imageData);
    };
    
    actions.appendChild(downloadImgBtn);
    overlay.appendChild(info);
    
    galleryItem.appendChild(img);
    galleryItem.appendChild(overlay);
    galleryItem.appendChild(actions);
    gallery.appendChild(galleryItem);
}


// Download single image
function downloadSingleImage(imageData) {
    const link = document.createElement('a');
    link.href = `${API_URL}${imageData.url}`;
    link.download = imageData.filename;
    link.click();
}

// Remove image
async function removeImage(index, filename) {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    showLoading(true);

    try {
        const response = await fetch(`${API_URL}/api/images/${filename}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            galleryImages.splice(index, 1);
            refreshGallery();
            showNotification('Photo deleted successfully', 'success');
        } else {
            showNotification('Failed to delete image', 'error');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        showNotification('Error deleting image', 'error');
    } finally {
        showLoading(false);
    }
}

// Refresh gallery
function refreshGallery() {
    gallery.innerHTML = '';
    galleryImages.forEach((imageData, index) => {
        addImageToGallery(imageData, index);
    });
    updateUI();
}

// Update UI
function updateUI() {
    photoCount.textContent = galleryImages.length;
    
    if (galleryImages.length === 0) {
        emptyState.style.display = 'block';
        gallery.style.display = 'none';
        downloadBtn.disabled = true;
        selectAllBtn.disabled = true;
    } else {
        emptyState.style.display = 'none';
        gallery.style.display = 'grid';
        downloadBtn.disabled = false;
        selectAllBtn.disabled = false;
    }
}

// Modal functions
function openModal(index) {
    currentModalIndex = index;
    const imageData = galleryImages[index];
    modalImg.src = `${API_URL}${imageData.url}`;
    modalCaption.textContent = `Photo ${index + 1} of ${galleryImages.length}`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.querySelector('.modal-close').addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

document.getElementById('modalPrev').addEventListener('click', () => {
    currentModalIndex = (currentModalIndex - 1 + galleryImages.length) % galleryImages.length;
    openModal(currentModalIndex);
});

document.getElementById('modalNext').addEventListener('click', () => {
    currentModalIndex = (currentModalIndex + 1) % galleryImages.length;
    openModal(currentModalIndex);
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') document.getElementById('modalPrev').click();
    if (e.key === 'ArrowRight') document.getElementById('modalNext').click();
});

// Download PDF
downloadBtn.addEventListener('click', async function() {
    if (galleryImages.length === 0) return;
    
    showLoading(true);
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (imgWidth * 3) / 4;
        
        // Title page
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(40);
        pdf.text('Anniversary', pageWidth / 2, pageHeight / 2 - 30, { align: 'center' });
        pdf.text('Album 2025', pageWidth / 2, pageHeight / 2, { align: 'center' });
        
        pdf.setFontSize(16);
        pdf.text('Computer Institute Celebration', pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });
        
        pdf.setFontSize(12);
        const date = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        pdf.text(date, pageWidth / 2, pageHeight / 2 + 40, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.text(`${galleryImages.length} Memorable Moments`, pageWidth / 2, pageHeight - 20, { align: 'center' });
        
        // Add images
        for (let i = 0; i < galleryImages.length; i++) {
            pdf.addPage();
            
            const imgUrl = `${API_URL}${galleryImages[i].url}`;
            
            try {
                pdf.addImage(imgUrl, 'JPEG', margin, margin + 10, imgWidth, imgHeight);
            } catch (err) {
                console.error('Error adding image to PDF:', err);
            }
            
            // Image caption
            pdf.setFillColor(99, 102, 241);
            pdf.roundedRect(margin, margin + imgHeight + 20, imgWidth, 15, 3, 3, 'F');
            
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.text(
                `Photo ${i + 1} of ${galleryImages.length}`, 
                pageWidth / 2, 
                margin + imgHeight + 30, 
                { align: 'center' }
            );
            
            // Footer
            pdf.setTextColor(150, 150, 150);
            pdf.setFontSize(8);
            pdf.text(
                'Computer Institute Anniversary 2025', 
                pageWidth / 2, 
                pageHeight - 10, 
                { align: 'center' }
            );
        }
        
        // Save PDF
        pdf.save(`Anniversary_Album_${Date.now()}.pdf`);
        showNotification('Album downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Error generating PDF. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
});

// Loading overlay
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize
updateUI();

// Enhanced Album Functionality
const albumModal = document.getElementById('albumModal');
const albumCoverWrapper = document.getElementById('albumCoverWrapper');
const flipBookWrapper = document.getElementById('flipBookWrapper');
const openAlbumBtn = document.getElementById('openAlbum');
const closeAlbumBtn = document.getElementById('closeAlbum');
const openBookBtn = document.getElementById('openBookBtn');
const albumNavPrev = document.getElementById('albumNavPrev');
const albumNavNext = document.getElementById('albumNavNext');
const mainAlbumPhoto = document.getElementById('mainAlbumPhoto');
const thumbnailContainer = document.getElementById('thumbnailContainer');
const albumProgressFill = document.getElementById('albumProgressFill');
const currentAlbumPhoto = document.getElementById('currentAlbumPhoto');
const totalAlbumPhotos = document.getElementById('totalAlbumPhotos');

let currentPhotoIndex = 0;

// Set cover date
document.getElementById('coverDate').textContent = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// Open album modal
openAlbumBtn.addEventListener('click', () => {
    if (galleryImages.length === 0) {
        showNotification('Please upload some photos first!', 'error');
        return;
    }
    
    albumModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    totalAlbumPhotos.textContent = galleryImages.length;
});

// Close album
closeAlbumBtn.addEventListener('click', () => {
    albumModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    albumCoverWrapper.style.display = 'block';
    flipBookWrapper.style.display = 'none';
    currentPhotoIndex = 0;
});

// Open book from cover
openBookBtn.addEventListener('click', () => {
    albumCoverWrapper.style.animation = 'fadeOut 0.5s ease forwards';
    
    setTimeout(() => {
        albumCoverWrapper.style.display = 'none';
        flipBookWrapper.style.display = 'block';
        initializeAlbum();
    }, 500);
});

// Initialize album
function initializeAlbum() {
    generateThumbnails();
    showPhoto(0);
}

// Generate thumbnails
function generateThumbnails() {
    thumbnailContainer.innerHTML = '';
    
    galleryImages.forEach((image, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'thumbnail-item';
        if (index === 0) thumb.classList.add('active');
        
        const img = document.createElement('img');
        img.src = `${API_URL}${image.url}`;
        img.alt = `Thumbnail ${index + 1}`;
        
        thumb.appendChild(img);
        thumb.addEventListener('click', () => showPhoto(index));
        
        thumbnailContainer.appendChild(thumb);
    });
}

// Show photo
function showPhoto(index) {
    if (index < 0 || index >= galleryImages.length) return;
    
    currentPhotoIndex = index;
    const image = galleryImages[index];
    
    // Update main photo with fade effect
    mainAlbumPhoto.style.opacity = '0';
    
    setTimeout(() => {
        mainAlbumPhoto.src = `${API_URL}${image.url}`;
        mainAlbumPhoto.style.opacity = '1';
    }, 300);
    
    // Update photo info
    document.getElementById('photoTitle').textContent = `Memory ${index + 1}`;
    document.getElementById('photoDate').innerHTML = `
        <i class="fas fa-clock"></i>
        ${new Date().toLocaleDateString()}
    `;
    
    // Update thumbnails
    document.querySelectorAll('.thumbnail-item').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
    
    // Scroll thumbnail into view
    const activeThumbnail = thumbnailContainer.children[index];
    if (activeThumbnail) {
        activeThumbnail.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }
    
    // Update counter
    currentAlbumPhoto.textContent = index + 1;
    
    // Update progress bar
    const progress = ((index + 1) / galleryImages.length) * 100;
    albumProgressFill.style.width = `${progress}%`;
    
    // Update navigation buttons
    albumNavPrev.disabled = index === 0;
    albumNavNext.disabled = index === galleryImages.length - 1;
}

// Navigation
albumNavPrev.addEventListener('click', () => {
    if (currentPhotoIndex > 0) {
        showPhoto(currentPhotoIndex - 1);
    }
});

albumNavNext.addEventListener('click', () => {
    if (currentPhotoIndex < galleryImages.length - 1) {
        showPhoto(currentPhotoIndex + 1);
    }
});

// Thumbnail scroll buttons
document.getElementById('thumbScrollLeft').addEventListener('click', () => {
    thumbnailContainer.scrollBy({
        left: -200,
        behavior: 'smooth'
    });
});

document.getElementById('thumbScrollRight').addEventListener('click', () => {
    thumbnailContainer.scrollBy({
        left: 200,
        behavior: 'smooth'
    });
});

// Download current photo
document.getElementById('downloadPhotoBtn').addEventListener('click', () => {
    downloadCurrentPhoto();
});

document.getElementById('albumDownloadCurrent').addEventListener('click', () => {
    downloadCurrentPhoto();
});

function downloadCurrentPhoto() {
    const image = galleryImages[currentPhotoIndex];
    const link = document.createElement('a');
    link.href = `${API_URL}${image.url}`;
    link.download = `Anniversary_Photo_${currentPhotoIndex + 1}.jpg`;
    link.click();
    showNotification('Photo downloaded successfully!', 'success');
}

// Share photo
document.getElementById('sharePhotoBtn').addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: 'Anniversary Photo',
            text: `Check out this memory from our anniversary celebration!`,
            url: window.location.href
        }).then(() => {
            showNotification('Photo shared successfully!', 'success');
        }).catch(() => {
            copyToClipboard();
        });
    } else {
        copyToClipboard();
    }
});

function copyToClipboard() {
    navigator.clipboard.writeText(window.location.href);
    showNotification('Link copied to clipboard!', 'success');
}

// Fullscreen photo
document.getElementById('fullscreenPhotoBtn').addEventListener('click', () => {
    openModal(currentPhotoIndex);
});

document.getElementById('albumFullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        albumModal.requestFullscreen().catch(err => {
            showNotification('Fullscreen not supported', 'error');
        });
    } else {
        document.exitFullscreen();
    }
});

// Album info
document.getElementById('albumInfo').addEventListener('click', () => {
    const info = `
        📸 Total Photos: ${galleryImages.length}
        📅 Date: ${new Date().toLocaleDateString()}
        🎉 Event: Computer Institute Anniversary 2025
        💝 Theme: Celebrating Excellence
    `;
    
    alert(info);
});

// Keyboard navigation for album
document.addEventListener('keydown', (e) => {
    if (!albumModal.classList.contains('active')) return;
    if (flipBookWrapper.style.display !== 'block') return;
    
    if (e.key === 'ArrowLeft') albumNavPrev.click();
    if (e.key === 'ArrowRight') albumNavNext.click();
    if (e.key === 'Escape') closeAlbumBtn.click();
    if (e.key === 'd' || e.key === 'D') downloadCurrentPhoto();
});

// Smooth transitions
mainAlbumPhoto.style.transition = 'opacity 0.3s ease';

// Add fadeOut animation
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.95);
        }
    }
`;
document.head.appendChild(fadeOutStyle);

