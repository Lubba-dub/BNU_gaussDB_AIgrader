window.ui = window.ui || {};
window.ui.showNotification = (message, type = 'info') => {
    // 使用浏览器原生 alert（简单但不够美观）
    alert(`${type.toUpperCase()}: ${message}`);

    // 或使用第三方库（如 SweetAlert2，推荐）
    // Swal.fire({
    //     icon: type === 'error' ? 'error' : 'success',
    //     title: message,
    //     showConfirmButton: false,
    //     timer: 3000
    // });
};

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
        if (!file) return;

        try {
            // 使用file_handler.js中的validateFile函数验证文件
            window.fileHandler.validateFile(file);
            
            // 显示文件信息
            const fileInfo = window.fileHandler.displayFileInfo(file);
            
            // 上传文件
            const formData = new FormData();
            formData.append('file', file);
            
            showMessage('info', '正在上传文件...');
            const response = await fetch(window.fileHandler.config.uploadEndpoint, {
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) throw new Error('上传失败');
    
            const result = await response.json();
            if (result.success) {
                showMessage('success', '文件上传成功，AI正在批改中...');
                window.fileHandler.handleUploadComplete(fileInfo, true);
                
                // 显示批改结果
                if (result.correction) {
                    displayCorrectionResult({
                        fileName: file.name,
                        homeworkId: result.homework_id,
                        correction: result.correction
                    });
                }
            } else {
                showMessage('error', result.message || '上传失败');
                window.fileHandler.handleUploadComplete(fileInfo, false, result.message || '上传失败');
            }
        } catch (error) {
            console.error('文件上传出错:', error);
            showMessage('error', error.message || '上传失败，请重试');
        }
    }

    // 移除文件处理已移至file_handler.js

    // AI批改处理
    async function startCorrection(fileId) {
        try {
            showMessage('info', 'AI正在批改作业...');
            const response = await fetch('/api/upload_homework', {
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
    function displayCorrectionResult(data) {
        // 确保结果容器存在
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) {
            console.error('找不到结果容器');
            return;
        }
    
        // 移除隐藏状态（如果存在）
        resultsContainer.classList.remove('hidden');
        
        // 解析数据结构
        const correction = data.correction || data;
        const fileName = data.fileName || correction.fileName || '未命名文档';
        const homeworkId = data.homeworkId || correction.homeworkId;
    
        // 填充元数据
        const resultDocName = document.getElementById('resultDocName');
        const resultDocType = document.getElementById('resultDocType');
        const resultSubmitTime = document.getElementById('resultSubmitTime');
        
        if (resultDocName) resultDocName.textContent = fileName;
        if (resultDocType) resultDocType.textContent = `文档类型：作业`;
        if (resultSubmitTime) resultSubmitTime.textContent = `提交时间：${new Date().toLocaleString()}`;
        
        // 更新分数
        const scoreElement = document.getElementById('resultScore');
        if (scoreElement) {
            const score = correction.score || 0;
            scoreElement.textContent = score.toFixed(1);
            // 动态颜色（红色 <60，黄色 60-80，绿色 >80）
            scoreElement.style.color = score < 60 ? '#ff4d4d' : 
                                      score < 80 ? '#ffc107' : '#28a745';
        }
    
        // 填充反馈内容
        const feedbackContent = document.getElementById('feedbackContent');
        if (feedbackContent) {
            feedbackContent.innerHTML = correction.feedback ? 
                `<p>${correction.feedback}</p>` :
                '<div class="alert alert-info">暂无详细反馈</div>';
        }
    
        // 生成建议列表
        const suggestionsList = document.getElementById('suggestionsList');
        if (suggestionsList) {
            const suggestions = correction.suggestions || ['暂无具体建议'];
            suggestionsList.innerHTML = suggestions
                .map(suggestion => `<li>${suggestion}</li>`)
                .join('');
        }
    
        // 滚动到结果区域（平滑滚动）
        const correctionResults = document.getElementById('correctionResults');
        if (correctionResults) {
            correctionResults.scrollIntoView({
                behavior: 'smooth'
            });
        }
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
