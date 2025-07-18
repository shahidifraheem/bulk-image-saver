chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "downloadImages") {
        request.urls.forEach((url, index) => {
            // Generate a filename from the URL
            const filename = url.split('/').pop() || `image-${Date.now()}-${index}.jpg`;

            chrome.downloads.download({
                url: url,
                filename: filename,
                conflictAction: 'uniquify'
            });
        });

        sendResponse({ message: `Started downloading ${request.urls.length} images` });
    }
});