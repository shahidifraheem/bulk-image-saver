// Wrap everything in a try-catch to prevent errors from breaking the script
try {
    // Create a unique identifier for this script run
    const scriptRunId = Date.now();

    // Find all images on the page
    const foundImages = Array.from(document.images).map(img => {
        return {
            url: img.src,
            width: img.naturalWidth,
            height: img.naturalHeight,
            size: getImageSize(img.src)
        };
    });

    // Filter out duplicates and very small images
    const uniqueImages = foundImages.filter((img, index, self) =>
        img.width > 50 &&
        img.height > 50 &&
        index === self.findIndex(i => i.url === img.url)
    );

    // Send the images back to the popup
    chrome.runtime.sendMessage({
        action: "imagesFound",
        images: uniqueImages,
        runId: scriptRunId
    });

    function getImageSize(url) {
        // This is a placeholder - in a real extension, you might need to 
        // make a HEAD request to get the actual file size
        return url.length; // Just a dummy value
    }
} catch (error) {
    console.error('Image Downloader Error:', error);
    chrome.runtime.sendMessage({
        action: "imageScanError",
        error: error.message
    });
}