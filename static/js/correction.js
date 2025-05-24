document.addEventListener('DOMContentLoaded', function() {
    // 文件上传区域交互
    const uploadBox = document.querySelector('.upload-box');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.doc,.docx';
    fileInput.style.display = 'none';
    uploadBox.appendChild(fileInput);

    // 拖拽上传
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // 点击上传
    uploadBox.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // 处理文件上传
    async function handleFileUpload(file) {
        // 验证文件类型
        const validTypes = ['.doc', '.docx'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validTypes.includes(fileExtension)) {
            showMessage('error', '请上传Word文档（.doc或.docx格式）');
            return;
        }

        // 验证文件大小（最大10MB）
        if (file.size > 10 * 1024 * 1024) {
            showMessage('error', '文件大小不能超过10MB');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            showMessage('info', '正在上传文件...');
            const response = await fetch('/api/upload_homework', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('上传失败');
            }

            const result = await response.json();
            if (result.success) {
                showMessage('success', '文件上传成功');
                updateFileInfo(file.name);
                // 开始AI批改
                startCorrection(result.fileId);
            } else {
                showMessage('error', result.message || '上传失败');
            }
        } catch (error) {
            console.error('文件上传出错:', error);
            showMessage('error', '上传失败，请重试');
        }
    }

    // 更新文件信息显示
    function updateFileInfo(fileName) {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <i class="fas fa-file-word"></i>
            <span>${fileName}</span>
            <div class="file-actions">
                <button class="btn btn-secondary btn-sm" onclick="removeFile(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        uploadBox.innerHTML = '';
        uploadBox.appendChild(fileInfo);
    }

    // 移除文件
    window.removeFile = function(button) {
        const fileInfo = button.closest('.file-info');
        fileInfo.remove();
        uploadBox.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>拖拽文件到此处或点击上传</p>
            <span>支持 .doc, .docx 格式</span>
        `;
    };

    // AI批改处理
    async function startCorrection(fileId) {
        try {
            showMessage('info', 'AI正在批改作业...');
            const response = await fetch('/api/correct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileId })
            });

            if (!response.ok) {
                throw new Error('批改请求失败');
            }

            const result = await response.json();
            if (result.success) {
                showMessage('success', '批改完成');
                displayCorrectionResult(result.correction);
            } else {
                showMessage('error', result.message || '批改失败');
            }
        } catch (error) {
            console.error('批改过程出错:', error);
            showMessage('error', '批改失败，请重试');
        }
    }

    // 显示批改结果
    function displayCorrectionResult(correction) {
        const resultArea = document.querySelector('.correction-result');
        resultArea.innerHTML = `
            <div class="result-header">
                <h3>批改结果</h3>
                <div class="score">${correction.score}分</div>
            </div>
            <div class="result-content">
                <div class="feedback">
                    <h4>评价反馈</h4>
                    <p>${correction.feedback}</p>
                </div>
                <div class="suggestions">
                    <h4>改进建议</h4>
                    <ul>
                        ${correction.suggestions.map(suggestion => 
                            `<li>${suggestion}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // 聊天功能
    const chatInput = document.querySelector('.chat-input textarea');
    const sendButton = document.querySelector('.chat-input button');
    const chatMessages = document.querySelector('.chat-messages');

    sendButton.addEventListener('click', () => {
        sendMessage();
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // 添加用户消息到聊天区域
        appendMessage('user', message);
        chatInput.value = '';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error('发送消息失败');
            }

            const result = await response.json();
            if (result.success) {
                appendMessage('ai', result.reply);
            } else {
                showMessage('error', '消息发送失败');
            }
        } catch (error) {
            console.error('发送消息出错:', error);
            showMessage('error', '发送失败，请重试');
        }
    }

    function appendMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 消息提示
    function showMessage(type, message) {
        window.ui.showNotification(message, type);
    }
});
