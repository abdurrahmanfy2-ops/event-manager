// Cloud Storage Manager for College Event Hub
// Supports multiple storage backends with local fallback

class CloudStorageManager {
    constructor(options = {}) {
        this.apiBase = 'http://localhost:8001';
        this.storageType = options.storageType || 'local'; // 'local', 'aws-s3', 'google-cloud', 'azure'
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
        this.allowedTypes = options.allowedTypes || ['image/', 'video/', 'application/pdf'];
        this.uploadQueue = [];
        this.isUploading = false;
        this.initialize();
    }

    /**
     * Initialize storage configuration
     */
    initialize() {
        this.createUploadDirectories();

        // Check for storage credentials in environment
        if (window.AWS_ACCESS_KEY || window.GCP_PROJECT_ID || window.AZURE_STORAGE_KEY) {
            this.storageType = this.detectStorageType();
        }

        console.log(`☁️ Cloud Storage initialized: ${this.storageType} mode`);
    }

    /**
     * Detect available storage type from environment
     */
    detectStorageType() {
        if (window.AWS_ACCESS_KEY && window.AWS_SECRET_KEY) {
            return 'aws-s3';
        } else if (window.GCP_PROJECT_ID && window.GCP_STORAGE_BUCKET) {
            return 'google-cloud';
        } else if (window.AZURE_STORAGE_KEY && window.AZURE_CONTAINER) {
            return 'azure';
        }
        return 'local';
    }

    /**
     * Create necessary directories for local storage
     */
    createUploadDirectories() {
        const directories = ['uploads', 'uploads/images', 'uploads/documents', 'uploads/temp'];

        directories.forEach(dir => {
            if (!localStorage.getItem(`dir_${dir}`)) {
                localStorage.setItem(`dir_${dir}`, JSON.stringify([]));
                console.log(`📁 Created directory: ${dir}`);
            }
        });
    }

    /**
     * Upload single file
     */
    async uploadFile(file, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                // Validate file
                const validation = this.validateFile(file);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }

                // Prepare upload
                const fileId = this.generateFileId();
                const uploadPath = this.buildUploadPath(file, options.category || 'general');

                // Update progress
                this.onProgress(0, file.name);

                // Upload based on storage type
                const result = await this.uploadToStorage(file, fileId, uploadPath, (progress) => {
                    this.onProgress(progress, file.name);
                });

                // Complete progress
                this.onProgress(100, file.name);

                resolve({
                    id: fileId,
                    originalName: file.name,
                    size: file.size,
                    type: file.type,
                    url: result.url,
                    path: uploadPath,
                    uploadedAt: new Date().toISOString(),
                    storage: this.storageType,
                    metadata: {
                        width: firstImage.width || null,
                        height: firstImage.height || null,
                        extension: file.name.split('.').pop().toLowerCase()
                    },
                    thumbnail: await this.generateThumbnail(file, fileId)
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Upload multiple files
     */
    async uploadFiles(files, options = {}) {
        const results = [];
        const errors = [];
        let totalProgress = 0;

        this.onBatchProgress(0, files.length);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const result = await this.uploadFile(file, options);
                results.push(result);
            } catch (error) {
                errors.push({ file: file.name, error: error.message });
            }

            totalProgress = ((i + 1) / files.length) * 100;
            this.onBatchProgress(totalProgress, files.length);
        }

        return { results, errors };
    }

    /**
     * Upload to selected storage backend
     */
    async uploadToStorage(file, fileId, path, onProgress = () => {}) {
        switch (this.storageType) {
            case 'aws-s3':
                return await this.uploadToS3(file, path, onProgress);
            case 'google-cloud':
                return await this.uploadToGCP(file, path, onProgress);
            case 'azure':
                return await this.uploadToAzure(file, path, onProgress);
            default:
                return await this.uploadLocal(file, path, onProgress);
        }
    }

    /**
     * Upload to AWS S3 (production)
     */
    async uploadToS3(file, path, onProgress) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);
        formData.append('storage', 's3');

        const response = await this.authenticatedFetch('/upload/s3', {
            method: 'POST',
            body: formData,
            onProgress
        });

        if (!response.ok) {
            throw new Error('S3 upload failed');
        }

        const data = await response.json();
        return { url: data.url, path: data.path };
    }

    /**
     * Upload to Google Cloud Storage (production)
     */
    async uploadToGCP(file, path, onProgress) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);
        formData.append('storage', 'gcp');

        const response = await this.authenticatedFetch('/upload/gcp', {
            method: 'POST',
            body: formData,
            onProgress
        });

        if (!response.ok) {
            throw new Error('GCP upload failed');
        }

        const data = await response.json();
        return { url: data.url, path: data.path };
    }

    /**
     * Upload to Azure Blob Storage (production)
     */
    async uploadToAzure(file, path, onProgress) {
        // Similar implementation as S3/GCP
        throw new Error('Azure upload not implemented yet');
    }

    /**
     * Upload to local storage (development)
     */
    async uploadLocal(file, path, onProgress) {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = () => {
                // Store locally in localStorage (simulated)
                const fileData = btoa(reader.result);
                const localFiles = JSON.parse(localStorage.getItem('cloud_files') || '{}');
                localFiles[path] = {
                    data: fileData,
                    type: file.type,
                    originalName: file.name,
                    uploadedAt: new Date().toISOString()
                };
                localStorage.setItem('cloud_files', JSON.stringify(localFiles));

                // Also upload to backend for persistence
                const formData = new FormData();
                formData.append('file', file);

                fetch(`${this.apiBase}/upload/file`, {
                    method: 'POST',
                    body: formData,
                    headers: this.getAuthHeaders()
                }).then(() => {
                    resolve({
                        url: `data:${file.type};base64,${fileData}`,
                        path: path
                    });
                }).catch(() => resolve({
                    url: `data:${file.type};base64,${fileData}`,
                    path: path
                }));
            };

            reader.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress((e.loaded / e.total) * 100);
                }
            };

            reader.readAsBinaryString(file);
        });
    }

    /**
     * Authenticated fetch wrapper
     */
    async authenticatedFetch(url, options = {}) {
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers
        };

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        return await fetch(`${this.apiBase}${url}`, {
            ...options,
            headers
        });
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        if (window.AuthManager && window.AuthManager.isAuthenticated()) {
            return window.AuthManager.getAuthHeaders();
        }
        return {};
    }

    /**
     * Validate file before upload
     */
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                error: `File size exceeds ${this.formatFileSize(this.maxFileSize)} limit`
            };
        }

        // Check file type
        const isValidType = this.allowedTypes.some(type => file.type.startsWith(type));
        if (!isValidType) {
            return {
                valid: false,
                error: 'File type not allowed'
            };
        }

        return { valid: true };
    }

    /**
     * Generate unique file ID
     */
    generateFileId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `file_${timestamp}_${random}`;
    }

    /**
     * Build upload path
     */
    buildUploadPath(file, category = 'general') {
        const extension = file.name.split('.').pop();
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const user = window.AuthManager?.getCurrentUser()?.email || 'anonymous';

        return `uploads/${category}/${timestamp}/${this.generateFileId()}.${extension}`;
    }

    /**
     * Generate thumbnail for images
     */
    async generateThumbnail(file, fileId) {
        if (!file.type.startsWith('image/')) {
            return null;
        }

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = 150;
                canvas.height = (img.height * 150) / img.width;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Get file list from storage
     */
    async getFileList(category = null, limit = 50) {
        try {
            const params = new URLSearchParams();
            if (category) params.set('category', category);
            params.set('limit', limit);

            const response = await this.authenticatedFetch(`/files?${params}`);

            if (!response.ok) {
                // Fallback to local storage
                return this.getLocalFileList(category, limit);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch file list:', error);
            return this.getLocalFileList(category, limit);
        }
    }

    /**
     * Get local file list (fallback)
     */
    getLocalFileList(category = null, limit = 50) {
        const files = JSON.parse(localStorage.getItem('cloud_files') || '{}');
        const fileList = Object.entries(files).map(([path, metadata]) => ({
            path,
            ...metadata,
            url: metadata.url || `data:${metadata.type};base64,${metadata.data}`
        }));

        let filtered = fileList;
        if (category) {
            filtered = fileList.filter(file => file.path.includes(`/${category}/`));
        }

        return filtered.slice(0, limit);
    }

    /**
     * Delete file from storage
     */
    async deleteFile(filePath) {
        try {
            const response = await this.authenticatedFetch('/files/delete', {
                method: 'POST',
                body: JSON.stringify({ path: filePath })
            });

            if (!response.ok) {
                // Fallback to local storage
                this.deleteLocalFile(filePath);
                return { success: true, fallback: true };
            }

            return await response.json();
        } catch (error) {
            this.deleteLocalFile(filePath);
            return { success: true, fallback: true };
        }
    }

    /**
     * Delete local file (fallback)
     */
    deleteLocalFile(filePath) {
        const files = JSON.parse(localStorage.getItem('cloud_files') || '{}');
        delete files[filePath];
        localStorage.setItem('cloud_files', JSON.stringify(files));
    }

    /**
     * Progress callback handlers
     */
    onProgress(progress, fileName) {
        // Override this method to handle progress updates
        console.log(`📤 ${fileName}: ${progress.toFixed(1)}% uploaded`);
    }

    onBatchProgress(progress, totalFiles) {
        // Override this method to handle batch progress
        console.log(`📦 Batch upload: ${progress.toFixed(1)}% complete (${Math.round(progress/totalFiles * totalFiles)}/${totalFiles} files)`);
    }

    /**
     * Upload queue management
     */
    addToQueue(files, options = {}) {
        this.uploadQueue = this.uploadQueue.concat(files.map(file => ({ file, options })));
        this.processQueue();
    }

    async processQueue() {
        if (this.isUploading || this.uploadQueue.length === 0) {
            return;
        }

        this.isUploading = true;

        try {
            while (this.uploadQueue.length > 0) {
                const { file, options } = this.uploadQueue.shift();
                await this.uploadFile(file, options);
            }
        } finally {
            this.isUploading = false;
        }
    }
}

// Global cloud storage instance
const cloudStorage = new CloudStorageManager();

// Export for use in other modules
window.CloudStorage = cloudStorage;

// Helper functions
window.uploadFiles = (files, options = {}) => cloudStorage.uploadFiles(files, options);
window.uploadFileLocal = (file, options = {}) => cloudStorage.uploadFile(file, options);
window.deleteFileCloud = (filePath) => cloudStorage.deleteFile(filePath);
window.getFileList = (category, limit) => cloudStorage.getFileList(category, limit);

console.log('☁️ Cloud Storage Manager initialized');

/*
USAGE EXAMPLES:

// Upload single file
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    try {
        const result = await window.uploadFileLocal(file, { category: 'images' });
        console.log('Upload successful:', result);
    } catch (error) {
        console.error('Upload failed:', error);
    }
});

// Upload multiple files
const results = await window.uploadFiles(fileList, { category: 'documents' });

// Get file list
const files = await window.getFileList('images', 20);

// Delete file
await window.deleteFileCloud('uploads/images/2025-01-01/file_12345.jpg');
*/
