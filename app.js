// app.js
const canvas = document.getElementById('wallpaperCanvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const backgroundColorPicker = document.getElementById('backgroundColor');
const expandCheckbox = document.getElementById('expand');
const manualWidth = document.getElementById('manualWidth');
const manualHeight = document.getElementById('manualHeight');
const setManualBtn = document.getElementById('setManual');
const bgHexInput = document.getElementById('bgHex');
const bgRgbInput = document.getElementById('bgRgb');
const autoColorBtn = document.getElementById('autoColorBtn');
const eyedropperBtn = document.getElementById('eyedropperBtn');
const exportBtn = document.getElementById('export');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const rotateLeftBtn = document.getElementById('rotateLeft');
const rotateRightBtn = document.getElementById('rotateRight');
const skewXBtn = document.getElementById('skewX');
const skewYBtn = document.getElementById('skewY');
const resetTransformBtn = document.getElementById('resetTransform');
const zoomIndicator = document.createElement('div');
zoomIndicator.id = 'zoomIndicator';
document.body.appendChild(zoomIndicator);

// Initialize variables
let image = new Image();
let imageX = 0;
let imageY = 0;
let imageScale = 1;
let imageRotation = 0;
let imageSkewX = 0;
let imageSkewY = 0;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let canvasWidth = 0;
let canvasHeight = 0;
const expandPercentage = 0.1;

// Touch handling variables
let touchStartDistance = 0;
let initialScale = 1;
let touchStartRotation = 0;
let initialRotation = 0;
let touchStartSkew = { x: 0, y: 0 };
let initialSkew = { x: 0, y: 0 };

// Initialize color values
backgroundColorPicker.value = "#ffffff";
bgHexInput.value = "#FFFFFF";
bgRgbInput.value = "255,255,255";

// Device resolution handling
function getHardwareResolution() {
    return {
        width: screen.width * window.devicePixelRatio,
        height: screen.height * window.devicePixelRatio
    };
}

function updateResolutionFields() {
    const resolution = getHardwareResolution();
    manualWidth.placeholder = `Device: ${resolution.width}`;
    manualHeight.placeholder = `Device: ${resolution.height}`;
}

function setCanvasSize(width = null, height = null) {
    const isManual = width !== null && height !== null;
    let w = isManual ? width : getHardwareResolution().width;
    let h = isManual ? height : getHardwareResolution().height;

    if (expandCheckbox.checked && !isManual) {
        w *= (1 + expandPercentage);
        h *= (1 + expandPercentage);
    }

    canvasWidth = Math.max(1, Math.round(w));
    canvasHeight = Math.max(1, Math.round(h));

    const screenW = window.innerWidth;
    const screenH = window.innerHeight - document.getElementById('controls').offsetHeight;
    const scale = Math.min(screenW / canvasWidth, screenH / canvasHeight, 1);

    canvas.style.transformOrigin = 'top left';
    canvas.style.transform = `scale(${scale})`;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    drawImage();
}

// Image handling
upload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = e => {
        image.onload = () => {
            resetImageTransform();
            drawImage();
        };
        image.onerror = () => alert('Error loading image');
        image.src = e.target.result;
    };
    reader.onerror = () => alert('Error reading file');
    reader.readAsDataURL(file);
});

function resetImageTransform() {
    imageScale = 1;
    imageRotation = 0;
    imageSkewX = 0;
    imageSkewY = 0;
    imageX = (canvas.width - image.width) / 2;
    imageY = (canvas.height - image.height) / 2;
}

// Drawing functions
function drawImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = backgroundColorPicker.value;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (image.src) {
        ctx.save();
        
        // Apply transformations
        ctx.translate(imageX + (image.width * imageScale) / 2, imageY + (image.height * imageScale) / 2);
        ctx.rotate(imageRotation * Math.PI / 180);
        ctx.transform(1, imageSkewY, imageSkewX, 1, 0, 0);
        ctx.scale(imageScale, imageScale);
        
        ctx.drawImage(
            image, 
            -image.width / 2, 
            -image.height / 2, 
            image.width, 
            image.height
        );
        
        ctx.restore();

        // Draw center snapping guides
        drawSnappingGuides();
    }
}

function drawSnappingGuides() {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Calculate transformed image center
    const imgCenterX = imageX + (image.width * imageScale) / 2;
    const imgCenterY = imageY + (image.height * imageScale) / 2;
    
    const snapThreshold = 15;
    const isAlignedX = Math.abs(imgCenterX - centerX) < snapThreshold;
    const isAlignedY = Math.abs(imgCenterY - centerY) < snapThreshold;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 1;

    if (isAlignedX) {
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvasHeight);
        ctx.stroke();
        imageX = centerX - (image.width * imageScale) / 2;
    }

    if (isAlignedY) {
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvasWidth, centerY);
        ctx.stroke();
        imageY = centerY - (image.height * imageScale) / 2;
    }

    ctx.restore();
}

// Mouse/Touch interaction
function setupInteraction() {
    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
}

function handleMouseDown(e) {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scale;
    const mouseY = (e.clientY - rect.top) * scale;
    
    // Calculate drag offset considering transformations
    const transformedX = (mouseX - imageX - (image.width * imageScale) / 2) / imageScale;
    const transformedY = (mouseY - imageY - (image.height * imageScale) / 2) / imageScale;
    
    dragOffsetX = transformedX;
    dragOffsetY = transformedY;
}

function handleMouseMove(e) {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const mouseX = (e.clientX - rect.left) * scale;
        const mouseY = (e.clientY - rect.top) * scale;
        
        imageX = mouseX - dragOffsetX * imageScale - (image.width * imageScale) / 2;
        imageY = mouseY - dragOffsetY * imageScale - (image.height * imageScale) / 2;
        
        drawImage();
    }
}

function handleMouseUp() {
    isDragging = false;
}

function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        // Single touch (drag)
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const touchX = (touch.clientX - rect.left) * scale;
        const touchY = (touch.clientY - rect.top) * scale;
        
        // Calculate drag offset considering transformations
        const transformedX = (touchX - imageX - (image.width * imageScale) / 2) / imageScale;
        const transformedY = (touchY - imageY - (image.height * imageScale) / 2) / imageScale;
        
        dragOffsetX = transformedX;
        dragOffsetY = transformedY;
        isDragging = true;
    } else if (e.touches.length === 2) {
        // Multi-touch (pinch/rotate/skew)
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        // Calculate initial distance for pinch zoom
        touchStartDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        initialScale = imageScale;
        
        // Calculate initial angle for rotation
        touchStartRotation = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        ) * 180 / Math.PI;
        initialRotation = imageRotation;
        
        // Calculate initial skew
        const deltaX = touch2.clientX - touch1.clientX;
        const deltaY = touch2.clientY - touch1.clientY;
        touchStartSkew = {
            x: deltaY / deltaX * 0.1,
            y: deltaX / deltaY * 0.1
        };
        initialSkew = {
            x: imageSkewX,
            y: imageSkewY
        };
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        // Single touch drag
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const touchX = (touch.clientX - rect.left) * scale;
        const touchY = (touch.clientY - rect.top) * scale;
        
        imageX = touchX - dragOffsetX * imageScale - (image.width * imageScale) / 2;
        imageY = touchY - dragOffsetY * imageScale - (image.height * imageScale) / 2;
    } else if (e.touches.length === 2) {
        // Multi-touch transform
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        // Calculate current distance for pinch zoom
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        imageScale = Math.max(0.1, Math.min(initialScale * (currentDistance / touchStartDistance), 5));
        
        // Calculate current angle for rotation
        const currentRotation = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        ) * 180 / Math.PI;
        imageRotation = initialRotation + (currentRotation - touchStartRotation);
        
        // Calculate current skew
        const deltaX = touch2.clientX - touch1.clientX;
        const deltaY = touch2.clientY - touch1.clientY;
        const currentSkewX = deltaY / deltaX * 0.1;
        const currentSkewY = deltaX / deltaY * 0.1;
        imageSkewX = initialSkew.x + (currentSkewX - touchStartSkew.x);
        imageSkewY = initialSkew.y + (currentSkewY - touchStartSkew.y);
        
        // Limit skew to prevent extreme distortion
        imageSkewX = Math.max(-0.5, Math.min(imageSkewX, 0.5));
        imageSkewY = Math.max(-0.5, Math.min(imageSkewY, 0.5));
        
        // Update zoom indicator
        zoomIndicator.textContent = `Zoom: ${Math.round(imageScale * 100)}% | Rotate: ${Math.round(imageRotation)}°`;
        zoomIndicator.style.display = 'block';
    }
    
    drawImage();
}

function handleTouchEnd(e) {
    if (e.touches.length === 0) {
        isDragging = false;
        zoomIndicator.style.display = 'none';
    } else if (e.touches.length === 1) {
        // Switch back to drag mode if one finger is lifted
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const touchX = (touch.clientX - rect.left) * scale;
        const touchY = (touch.clientY - rect.top) * scale;
        
        // Calculate drag offset considering transformations
        const transformedX = (touchX - imageX - (image.width * imageScale) / 2) / imageScale;
        const transformedY = (touchY - imageY - (image.height * imageScale) / 2) / imageScale;
        
        dragOffsetX = transformedX;
        dragOffsetY = transformedY;
        isDragging = true;
    }
}

// Transformation controls
zoomInBtn.addEventListener('click', () => {
    imageScale = Math.min(imageScale * 1.1, 5);
    drawImage();
});

zoomOutBtn.addEventListener('click', () => {
    imageScale = Math.max(imageScale * 0.9, 0.1);
    drawImage();
});

rotateLeftBtn.addEventListener('click', () => {
    imageRotation -= 15;
    drawImage();
});

rotateRightBtn.addEventListener('click', () => {
    imageRotation += 15;
    drawImage();
});

skewXBtn.addEventListener('click', () => {
    imageSkewX = Math.max(-0.5, Math.min(imageSkewX + 0.05, 0.5));
    drawImage();
});

skewYBtn.addEventListener('click', () => {
    imageSkewY = Math.max(-0.5, Math.min(imageSkewY + 0.05, 0.5));
    drawImage();
});

resetTransformBtn.addEventListener('click', () => {
    resetImageTransform();
    drawImage();
});

// Color handling (same as before)
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(h => h + h).join('');
    const int = parseInt(hex, 16);
    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255
    };
}

function getAverageBorderColor(img) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tempCtx.drawImage(img, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const isEdge = x === 0 || x === img.width - 1 || y === 0 || y === img.height - 1;
            if (isEdge) {
                const i = (y * img.width + x) * 4;
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
        }
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    return { r, g, b, hex: rgbToHex(r, g, b) };
}

function validateColorInputs() {
    const hex = bgHexInput.value;
    const rgb = bgRgbInput.value;
    
    // Validate hex
    if (/^#?[0-9A-F]{6}$/i.test(hex) || /^#?[0-9A-F]{3}$/i.test(hex)) {
        const fullHex = hex.startsWith('#') ? hex : '#' + hex;
        if (fullHex.length === 4) {
            const r = fullHex[1];
            const g = fullHex[2];
            const b = fullHex[3];
            backgroundColorPicker.value = `#${r}${r}${g}${g}${b}${b}`;
        } else {
            backgroundColorPicker.value = fullHex;
        }
        drawImage();
        return true;
    }
    
    // Validate RGB
    const rgbParts = rgb.split(',').map(p => parseInt(p.trim()));
    if (rgbParts.length === 3 && rgbParts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
        const hex = rgbToHex(...rgbParts);
        backgroundColorPicker.value = hex;
        bgHexInput.value = hex;
        drawImage();
        return true;
    }
    
    return false;
}

// Event listeners for color inputs (same as before)
bgHexInput.addEventListener('input', () => {
    if (validateColorInputs()) {
        const hex = bgHexInput.value.startsWith('#') ? bgHexInput.value : '#' + bgHexInput.value;
        const rgb = hexToRgb(hex);
        bgRgbInput.value = `${rgb.r},${rgb.g},${rgb.b}`;
    }
});

bgRgbInput.addEventListener('input', () => {
    validateColorInputs();
});

backgroundColorPicker.addEventListener('input', () => {
    const hex = backgroundColorPicker.value;
    const rgb = hexToRgb(hex);
    bgHexInput.value = hex;
    bgRgbInput.value = `${rgb.r},${rgb.g},${rgb.b}`;
    drawImage();
});

autoColorBtn.addEventListener('click', () => {
    if (!image.src) return alert('Please upload an image first');
    const avg = getAverageBorderColor(image);
    backgroundColorPicker.value = avg.hex;
    bgHexInput.value = avg.hex;
    bgRgbInput.value = `${avg.r},${avg.g},${avg.b}`;
    drawImage();
});

eyedropperBtn.addEventListener('click', async () => {
    if ('EyeDropper' in window) {
        const eyedropper = new EyeDropper();
        try {
            const result = await eyedropper.open();
            backgroundColorPicker.value = result.sRGBHex;
            bgHexInput.value = result.sRGBHex;
            const rgb = hexToRgb(result.sRGBHex);
            bgRgbInput.value = `${rgb.r},${rgb.g},${rgb.b}`;
            drawImage();
        } catch (err) {
            console.log('Eyedropper canceled');
        }
    } else {
        alert('Eyedropper not supported. Please use Chrome/Edge 95+ or Firefox 96+');
    }
});

setManualBtn.addEventListener('click', () => {
    const width = parseInt(manualWidth.value) || parseInt(manualWidth.placeholder.match(/\d+/)[0]);
    const height = parseInt(manualHeight.value) || parseInt(manualHeight.placeholder.match(/\d+/)[0]);
    if (width > 0 && height > 0) {
        setCanvasSize(width, height);
    } else {
        alert('Please enter valid dimensions (greater than 0)');
    }
});

exportBtn.addEventListener('click', () => {
    if (!image.src) return alert('Please upload an image first');
    const link = document.createElement('a');
    link.download = 'wallpaper-' + new Date().getTime() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Initialize
window.addEventListener('load', () => {
    updateResolutionFields();
    setCanvasSize();
    setupInteraction();
});