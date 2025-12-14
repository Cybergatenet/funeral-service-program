// DOM Elements
const startScannerBtn = document.getElementById('start-scanner');
const stopScannerBtn = document.getElementById('stop-scanner');
const switchCameraBtn = document.getElementById('switch-camera');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const hiddenDownload = document.getElementById('hidden-download');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileType = document.getElementById('file-type');
const fileStatus = document.getElementById('file-status');
const currentYear = document.getElementById('current-year');
const placeholder = document.querySelector('.placeholder');

// QR Code Scanner instance
let qrCodeScanner = null;
let currentCameraId = null;
let cameras = [];
let currentCameraIndex = 0;
let scannedFileUrl = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    currentYear.textContent = new Date().getFullYear();
    
    // Set up event listeners
    startScannerBtn.addEventListener('click', startScanner);
    stopScannerBtn.addEventListener('click', stopScanner);
    switchCameraBtn.addEventListener('click', switchCamera);
    downloadBtn.addEventListener('click', downloadFile);
    resetBtn.addEventListener('click', resetScanner);
    
    // Initialize button states
    updateButtonStates();
});

// Start QR code scanner
async function startScanner() {
    try {
        // Get available cameras
        cameras = await Html5Qrcode.getCameras();
        
        if (cameras.length === 0) {
            alert('No cameras found. Please check your camera permissions.');
            return;
        }
        
        // Create scanner instance if it doesn't exist
        if (!qrCodeScanner) {
            qrCodeScanner = new Html5Qrcode("qr-reader");
        }
        
        // Start with the first camera
        currentCameraId = cameras[0].id;
        currentCameraIndex = 0;
        
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            handleScannedCode(decodedText);
        };
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        await qrCodeScanner.start(
            currentCameraId,
            config,
            qrCodeSuccessCallback,
            (errorMessage) => {
                // Quietly handle scanning errors
                console.debug("QR Code scan error:", errorMessage);
            }
        );
        
        // Update UI
        startScannerBtn.disabled = true;
        stopScannerBtn.disabled = false;
        switchCameraBtn.disabled = false;
        
    } catch (error) {
        console.error("Failed to start scanner:", error);
        alert(`Error starting scanner: ${error.message}`);
    }
}

// Stop QR code scanner
function stopScanner() {
    if (qrCodeScanner) {
        qrCodeScanner.stop().then(() => {
            // Scanner stopped successfully
            updateButtonStates();
        }).catch((error) => {
            console.error("Failed to stop scanner:", error);
        });
    }
}

// Switch between available cameras
function switchCamera() {
    if (cameras.length <= 1) {
        alert('Only one camera is available.');
        return;
    }
    
    // Stop current scanner
    qrCodeScanner.stop().then(() => {
        // Switch to next camera
        currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
        currentCameraId = cameras[currentCameraIndex].id;
        
        // Restart with new camera
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            handleScannedCode(decodedText);
        };
        
        qrCodeScanner.start(
            currentCameraId,
            config,
            qrCodeSuccessCallback,
            (errorMessage) => {
                console.debug("QR Code scan error:", errorMessage);
            }
        );
        
        // Update camera info
        console.log(`Switched to camera: ${cameras[currentCameraIndex].label}`);
    }).catch((error) => {
        console.error("Failed to switch camera:", error);
    });
}

// Handle scanned QR code
function handleScannedCode(decodedText) {
    console.log("Scanned URL:", decodedText);
    
    // Validate the scanned URL
    if (!isValidUrl(decodedText)) {
        fileStatus.textContent = "Invalid URL scanned";
        fileStatus.className = "status";
        fileStatus.style.color = "#e74c3c";
        return;
    }
    
    // Check if it's a PDF file
    if (!decodedText.toLowerCase().endsWith('.pdf')) {
        fileStatus.textContent = "Scanned file is not a PDF";
        fileStatus.className = "status";
        fileStatus.style.color = "#e74c3c";
        return;
    }
    
    // Store the scanned URL
    scannedFileUrl = decodedText;
    
    // Extract filename from URL
    const urlParts = decodedText.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // Update UI with file info
    fileName.textContent = decodeURIComponent(filename);
    fileType.textContent = "PDF Document";
    fileStatus.textContent = "Ready to download";
    fileStatus.className = "status";
    fileStatus.style.color = "#2ecc71";
    
    // Show file info card
    placeholder.style.display = 'none';
    fileInfo.style.display = 'block';
    
    // Stop scanner after successful scan
    stopScanner();
    
    // Show success message
    showNotification("QR Code scanned successfully! File ready to download.");
}

// Download the scanned file
function downloadFile() {
    if (!scannedFileUrl) {
        alert("No file URL available. Please scan a QR code first.");
        return;
    }
    
    // Update status
    fileStatus.textContent = "Downloading...";
    fileStatus.style.color = "#3498db";
    
    // Create a temporary download link
    hiddenDownload.href = scannedFileUrl;
    hiddenDownload.download = fileName.textContent;
    
    // Trigger download
    hiddenDownload.click();
    
    // Update status after a short delay
    setTimeout(() => {
        fileStatus.textContent = "Download complete!";
        fileStatus.style.color = "#2ecc71";
        showNotification("File downloaded successfully!");
    }, 1000);
}

// Reset scanner and clear results
function resetScanner() {
    // Clear file info
    scannedFileUrl = null;
    
    // Hide file info card
    fileInfo.style.display = 'none';
    placeholder.style.display = 'block';
    
    // Update button states
    updateButtonStates();
    
    // Show notification
    showNotification("Ready to scan a new QR code");
}

// Update button states
function updateButtonStates() {
    startScannerBtn.disabled = qrCodeScanner && qrCodeScanner.isScanning;
    stopScannerBtn.disabled = !qrCodeScanner || !qrCodeScanner.isScanning;
    switchCameraBtn.disabled = !qrCodeScanner || !qrCodeScanner.isScanning;
}

// Validate URL
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

// Show notification
function showNotification(message) {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Handle page visibility change (stop scanner when page is hidden)
document.addEventListener('visibilitychange', function() {
    if (document.hidden && qrCodeScanner && qrCodeScanner.isScanning) {
        stopScanner();
    }
});

// Error handling for camera permissions
function handleCameraError(error) {
    console.error("Camera error:", error);
    let errorMessage = "Camera access denied. ";
    
    if (error.name === 'NotAllowedError') {
        errorMessage += "Please allow camera access in your browser settings.";
    } else if (error.name === 'NotFoundError') {
        errorMessage += "No camera found on your device.";
    } else if (error.name === 'NotReadableError') {
        errorMessage += "Camera is already in use by another application.";
    } else {
        errorMessage += error.message;
    }
    
    alert(errorMessage);
    startScannerBtn.disabled = false;
    stopScannerBtn.disabled = true;
    switchCameraBtn.disabled = true;
}

// Add error handling for the scanner
window.addEventListener('error', function(event) {
    if (event.message.includes('Html5Qrcode')) {
        console.error('QR Scanner Error:', event.error);
        showNotification('Scanner error occurred. Please try again.');
    }
});