// Enhanced image scanner with data: URL exclusion
async function scanPageForImages() {
    try {
        // 1. Get regular <img> tags (excluding data: URLs)
        const imgElements = Array.from(document.images)
            .filter(img => {
                try {
                    return img.src &&
                        !img.src.startsWith('data:') &&
                        new URL(img.src).protocol.startsWith('http');
                } catch {
                    return false;
                }
            })
            .map(img => ({
                url: img.src,
                width: img.naturalWidth,
                height: img.naturalHeight,
                type: 'img-tag',
                size: 0 // Placeholder
            }));

        // 2. Get background images (excluding data: URLs)
        const bgImageElements = Array.from(document.querySelectorAll('*'))
            .filter(el => {
                try {
                    const style = window.getComputedStyle(el);
                    return style.backgroundImage.includes('url(') &&
                        !style.backgroundImage.includes('data:');
                } catch {
                    return false;
                }
            })
            .map(el => {
                try {
                    const style = window.getComputedStyle(el);
                    const urlMatch = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/i);
                    if (!urlMatch || !urlMatch[1]) return null;

                    // Convert to absolute URL
                    let imageUrl;
                    try {
                        imageUrl = new URL(urlMatch[1], window.location.href).href;
                    } catch {
                        imageUrl = urlMatch[1];
                    }

                    // Final validation
                    if (!imageUrl.startsWith('http')) return null;

                    return {
                        url: imageUrl,
                        width: el.offsetWidth,
                        height: el.offsetHeight,
                        type: 'background',
                        size: 0
                    };
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        // 3. Combine and dedupe
        const allImages = [...imgElements, ...bgImageElements]
            .filter((img, index, self) =>
                img.width > 50 &&
                img.height > 50 &&
                index === self.findIndex(i => i.url === img.url)
            );

        // 4. Get sizes (with timeout)
        const imagesWithSizes = await Promise.all(
            allImages.map(img => fetchImageSize(img.url)
                .then(size => ({ ...img, size }))
                .catch(() => ({ ...img, size: 0 }))
            ));

        return imagesWithSizes.filter(img => img.size >= 0);

    } catch (error) {
        console.error('Scan error:', error);
        return [];
    }
}

// Robust image size fetcher
function fetchImageSize(url) {
    return new Promise((resolve, reject) => {
        if (!url || url.startsWith('data:')) {
            reject('Invalid URL');
            return;
        }

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        const timer = setTimeout(() => {
            img.onload = img.onerror = null;
            reject('Timeout');
        }, 5000);

        img.onload = function () {
            clearTimeout(timer);
            try {
                // Calculate size based on dimensions and type
                let size;
                if (url.toLowerCase().endsWith('.png')) {
                    size = this.width * this.height * 4; // PNG with alpha
                } else if (url.toLowerCase().match(/\.jpe?g$/)) {
                    size = this.width * this.height * 3; // JPEG
                } else {
                    size = (this.width * this.height * 3) / 2; // Default
                }
                resolve(Math.max(1024, size)); // Minimum 1KB
            } catch {
                resolve(0);
            }
        };

        img.onerror = function () {
            clearTimeout(timer);
            resolve(0);
        };

        img.src = url;
    });
}

// Execute scanner and send results
(async () => {
    const images = await scanPageForImages();
    chrome.runtime.sendMessage({
        action: "imagesFound",
        images: images
    });
})();