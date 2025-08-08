document.addEventListener('DOMContentLoaded', function () {
    // Initialize state
    let allSelected = false;
    const statusEl = document.getElementById('status');
    const imageListEl = document.getElementById('imageList');
    const findBtn = document.getElementById('findImages');
    const downloadBtn = document.getElementById('downloadSelected');
    const toggleBtn = document.getElementById('toggleSelectAll');

    // Find Images Button
    findBtn.addEventListener('click', () => {
        statusEl.textContent = 'Scanning page for images...';
        imageListEl.innerHTML = '';
        downloadBtn.disabled = true;
        toggleBtn.style.display = 'none';

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['js/content.js']
            }, () => {
                if (chrome.runtime.lastError) {
                    statusEl.textContent = 'Error: ' + chrome.runtime.lastError.message;
                }
            });
        });
    });

    // Toggle Select All
    toggleBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.image-item input[type="checkbox"]');
        allSelected = !allSelected;
        checkboxes.forEach(cb => cb.checked = allSelected);
        toggleBtn.textContent = allSelected ? 'Unselect All' : 'Select All';
        downloadBtn.disabled = !allSelected;
    });

    // Download Selected
    downloadBtn.addEventListener('click', () => {
        const urls = Array.from(
            document.querySelectorAll('.image-item input[type="checkbox"]:checked')
        ).map(el => el.dataset.url);

        if (!urls.length) {
            statusEl.textContent = 'No images selected';
            return;
        }

        statusEl.textContent = `Downloading ${urls.length} images...`;
        chrome.runtime.sendMessage(
            { action: "downloadImages", urls },
            (response) => {
                statusEl.textContent = response?.message || 'Download complete!';
                allSelected = false;
                toggleBtn.textContent = 'Select All';
            }
        );
    });

    // Message Listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "imagesFound") {
            renderImages(request.images);
        } else if (request.action === "scanError") {
            statusEl.textContent = `Error: ${request.error}`;
        }
    });

    // Image rendering function
    function renderImages(images) {
        imageListEl.innerHTML = '';

        if (!images?.length) {
            statusEl.textContent = 'No downloadable images found';
            return;
        }

        statusEl.textContent = `Found ${images.length} images`;
        downloadBtn.disabled = false;
        toggleBtn.style.display = 'inline-block';
        toggleBtn.textContent = 'Select All';
        allSelected = false;

        images.forEach(img => {
            const item = document.createElement('div');
            item.className = 'image-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.url = img.url;
            checkbox.checked = false;
            checkbox.addEventListener('change', updateDownloadButtonState);

            const preview = document.createElement('img');
            preview.className = 'image-preview';
            preview.src = img.url;
            preview.onerror = () => preview.style.opacity = '0.5';

            const info = document.createElement('span');
            info.textContent = `${img.width}x${img.height} | ${img.type} | ${formatBytes(img.size)}`;

            item.append(checkbox, preview, info);
            imageListEl.appendChild(item);
        });

        function updateDownloadButtonState() {
            const hasSelection = document.querySelectorAll(
                '.image-item input[type="checkbox"]:checked'
            ).length > 0;
            downloadBtn.disabled = !hasSelection;
        }
    }

    // Helper function
    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return 'Size unknown';
        const units = ['B', 'KB', 'MB'];
        const i = Math.min(
            Math.floor(Math.log(bytes) / Math.log(1024)),
            units.length - 1
        );
        return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
    }
});