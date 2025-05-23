// file_handler.js - 文件上传和处理功能
document.addEventListener('DOMContentLoaded', function() {
    const fileUpload = document.getElementById('file-upload');
    const dropZone = document.getElementById('drop-zone');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadStatus = document.getElementById('upload-status');
    const fileList = document.getElementById('file-list');

    // 文件上传配置
    const config = {
        maxFileSize: 10 * 1024 * 1024, // 最大10MB
        allowedTypes: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        uploadEndpoint: '/api/upload'
    };

    // 验证文件
    function validateFile(file) {
        // 检查文件类型
        if (!config.allowedTypes.includes(file.type)) {
            throw new Error('只支持.doc和.docx格式的文件');
        }

        // 检查文件大小
        if (file.size > config.maxFileSize) {
            throw new Error('文件大小不能超过10MB');
        }

        return true;
    }

    // 显示文件信息
    function displayFileInfo(file) {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <div class="progress-bar">
                <div class="progress" style="width: 0%"></div>
            </div>
            <span class="status">准备上传...</span>
        `;
        fileList.appendChild(fileInfo);
        return fileInfo;
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 更新上传进度
    function updateProgress(fileInfo, progress) {
        const progressBar = fileInfo.querySelector('.progress');
        const status = fileInfo.querySelector('.status');
        progressBar.style.width = `${progress}%`;
        status.textContent = `上传中 ${progress}%`;
    }

    // 上传完成处理
    function handleUploadComplete(fileInfo, success, message) {
        const status = fileInfo.querySelector('.status');
        if (success) {
            fileInfo.classList.add('upload-success');
            status.textContent = '上传成功';
        } else {
            fileInfo.classList.add('upload-error');
            status.textContent = message || '上传失败';
        }

        // 3秒后移除文件信息
        setTimeout(() => {
            fileInfo.remove();
        }, 3000);
    }

    // 上传文件
    async function uploadFile(file) {
        try {
            validateFile(file);
            const fileInfo = displayFileInfo(file);

            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', config.uploadEndpoint, true);

            // 进度监听
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded * 100) / e.total);
                    updateProgress(fileInfo, progress);
                }
            };

            // 完成监听
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    handleUploadComplete(fileInfo, true);
                    // 触发自定义事件，通知文件上传成功
                    const event = new CustomEvent('fileUploaded', {
                        detail: {
                            file: file,
                            response: response
                        }
                    });
                    document.dispatchEvent(event);
                } else {
                    handleUploadComplete(fileInfo, false, '上传失败');
                }
            };

            // 错误监听
            xhr.onerror = () => {
                handleUploadComplete(fileInfo, false, '网络错误');
            };

            xhr.send(formData);

        } catch (error) {
            displayError(error.message);
        }
    }

    // 显示错误消息
    function displayError(message) {
        window.ui.showNotification(message, 'error');
    }

    // 文件选择处理
    fileUpload.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(uploadFile);
        fileUpload.value = ''; // 清空选择，允许重复选择同一文件
    });

    // 拖放处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        files.forEach(uploadFile);
    });

    // 点击上传区域触发文件选择
    dropZone.addEventListener('click', () => {
        fileUpload.click();
    });

    // 防止文件在新窗口打开
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
});