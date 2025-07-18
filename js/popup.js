// Initialize state
let allSelected = false;

document.getElementById('findImages').addEventListener('click', () => {
    document.getElementById('status').textContent = 'Scanning page for images...';
    document.getElementById('imageList').innerHTML = '';
    document.getElementById('downloadSelected').disabled = true;
    document.getElementById('toggleSelectAll').style.display = 'none';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['js/content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                document.getElementById('status').textContent = 'Error: ' + chrome.runtime.lastError.message;
            }
        });
    });
});

// Toggle select all functionality
document.getElementById('toggleSelectAll').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.image-item input[type="checkbox"]');

    allSelected = !allSelected;
    checkboxes.forEach(checkbox => {
        checkbox.checked = allSelected;
    });

    document.getElementById('toggleSelectAll').textContent = allSelected ? 'Unselect All' : 'Select All';
    document.getElementById('downloadSelected').disabled = !allSelected;
});

document.getElementById('downloadSelected').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.image-item input[type="checkbox"]:checked');
    const urls = Array.from(checkboxes).map(checkbox => checkbox.dataset.url);

    if (urls.length === 0) {
        document.getElementById('status').textContent = 'No images selected';
        return;
    }

    document.getElementById('status').textContent = `Downloading ${urls.length} images...`;

    chrome.runtime.sendMessage({ action: "downloadImages", urls: urls }, (response) => {
        document.getElementById('status').textContent = response.message;
        allSelected = false;
        document.getElementById('toggleSelectAll').textContent = 'Select All';
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "imagesFound") {
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = '';

        if (request.images.length === 0) {
            document.getElementById('status').textContent = 'No images found on this page';
            return;
        }

        document.getElementById('status').textContent = `Found ${request.images.length} images`;
        document.getElementById('downloadSelected').disabled = false;
        document.getElementById('toggleSelectAll').style.display = 'inline-block';
        document.getElementById('toggleSelectAll').textContent = 'Select All';
        allSelected = false;

        request.images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'image-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.url = img.url;
            checkbox.checked = false;
            checkbox.addEventListener('change', () => {
                const anyChecked = document.querySelectorAll('.image-item input[type="checkbox"]:checked').length > 0;
                document.getElementById('downloadSelected').disabled = !anyChecked;
            });

            const preview = document.createElement('img');
            preview.className = 'image-preview';
            preview.src = img.url;

            const info = document.createElement('span');
            info.textContent = `${img.width}x${img.height} - ${formatBytes(img.size)}`;

            div.appendChild(checkbox);
            div.appendChild(preview);
            div.appendChild(info);
            imageList.appendChild(div);
        });
    }
});

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}