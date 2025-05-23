// chat.js - AI作业批改对话功能
document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatContainer = document.querySelector('.chat-container');
    const clearButton = document.getElementById('clear-chat');
    const themeToggle = document.getElementById('theme-toggle');
    const fileUpload = document.getElementById('file-upload');
    const dropZone = document.getElementById('drop-zone');

    // 消息历史记录
    let messageHistory = [
        {
            role: "system",
            content: "你是一位专业的教育评估专家和作业批改助手。你的职责是：\n1. 仔细阅读学生提交的作业内容\n2. 根据学术标准评估作业质量\n3. 考虑内容的准确性、完整性和创新性\n4. 评估论述的逻辑性和连贯性\n5. 检查格式规范\n6. 提供具体的改进建议"
        },
        {
            role: "assistant",
            content: "你好！我是你的作业批改助手。请上传你的作业文件或直接输入作业内容，我会为你提供专业的评估和建议。"
        }
    ];

    // 初始化
    const initialMessage = document.querySelector('.ai-message');
    initialMessage && setTimeout(() => initialMessage.classList.add('visible'), 300);
    loadMessageHistory();

    // 发送消息到AI
    async function sendMessageToAI(userMessage, isFile = false) {
        try {
            const loadingMessage = createLoadingMessage();
            chatMessages.appendChild(loadingMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // 如果是文件，先上传文件
            let content = userMessage;
            if (isFile) {
                const formData = new FormData();
                formData.append('file', userMessage);
                const uploadResponse = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    throw new Error('文件上传失败');
                }

                const uploadResult = await uploadResponse.json();
                content = uploadResult.content;
            }

            messageHistory.push({ role: "user", content: content });

            // 移除加载消息并创建AI消息容器
            chatMessages.removeChild(loadingMessage);
            const aiMessageDiv = createEmptyAIMessage();
            chatMessages.appendChild(aiMessageDiv);
            const aiMessageContent = aiMessageDiv.querySelector('.message-text');
            aiMessageDiv.classList.add('visible');
            
            // 使用全局API处理实例直接调用DeepSeek AI API
            let fullAIResponse = '';
            
            await window.api.callDeepSeekAI(
                messageHistory,
                // 处理每个数据块
                (parsed) => {
                    if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                        fullAIResponse += parsed.choices[0].delta.content;
                        updateAIMessageContent(aiMessageContent, fullAIResponse);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                },
                // 错误处理
                (error) => {
                    console.error('AI服务请求失败:', error);
                    displayErrorMessage('AI服务请求失败，请稍后再试。');
                },
                // 完成处理
                () => {
                    console.log('流式响应完成');
                }
            );

            messageHistory.push({ role: "assistant", content: fullAIResponse });
            saveMessageHistory();

        } catch (error) {
            console.error('发送消息失败:', error);
            document.querySelector('.loading-message')?.remove();
            displayErrorMessage('通信失败，请稍后再试。');
        }
    }

    // 保存消息历史
    function saveMessageHistory() {
        localStorage.setItem('homework_chat_history', JSON.stringify(messageHistory));
    }

    // 加载消息历史
    function loadMessageHistory() {
        const saved = localStorage.getItem('homework_chat_history');
        if (saved) {
            try {
                const history = JSON.parse(saved);
                messageHistory = [
                    history[0],
                    ...history.slice(Math.max(1, history.length - 20))
                ];

                chatMessages.innerHTML = '';
                messageHistory.slice(1).forEach(msg => {
                    displayMessage(msg.content, msg.role === 'assistant' ? 'ai' : 'user');
                });
            } catch (e) {
                console.error('加载历史失败:', e);
                localStorage.removeItem('homework_chat_history');
            }
        }
    }

    // 显示消息
    function displayMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';

        const avatarImg = document.createElement('img');
        if (sender === 'ai') {
            avatarImg.src = '/static/images/ai-avatar.png';
            avatarImg.alt = 'AI助手';
        } else {
            avatarImg.src = '/static/images/user-avatar.png';
            avatarImg.alt = '用户';
        }

        avatarDiv.appendChild(avatarImg);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        const now = new Date();
        timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        contentDiv.appendChild(timestamp);

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';

        const paragraphs = message.split('\n').filter(p => p.trim() !== '');
        paragraphs.forEach(paragraph => {
            const p = document.createElement('p');
            p.textContent = paragraph;
            textDiv.appendChild(p);
        });

        contentDiv.appendChild(textDiv);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        setTimeout(() => {
            messageDiv.classList.add('visible');
        }, 10);

        if (sender === 'ai') {
            addTypingEffect(textDiv);
        }
    }

    // 创建加载消息
    function createLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message loading-message';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';

        const avatarImg = document.createElement('img');
        avatarImg.src = '/static/images/ai-avatar.png';
        avatarImg.alt = 'AI助手';
        avatarDiv.appendChild(avatarImg);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';

        const loadingText = document.createElement('p');
        loadingText.innerHTML = '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';
        textDiv.appendChild(loadingText);

        contentDiv.appendChild(textDiv);
        loadingDiv.appendChild(avatarDiv);
        loadingDiv.appendChild(contentDiv);

        setTimeout(() => {
            loadingDiv.classList.add('visible');
        }, 10);

        return loadingDiv;
    }

    // 创建空的AI消息容器
    function createEmptyAIMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';

        const avatarImg = document.createElement('img');
        avatarImg.src = '/static/images/ai-avatar.png';
        avatarImg.alt = 'AI助手';
        avatarDiv.appendChild(avatarImg);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        const now = new Date();
        timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        contentDiv.appendChild(timestamp);

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        contentDiv.appendChild(textDiv);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        return messageDiv;
    }

    // 更新AI消息内容
    function updateAIMessageContent(textDiv, content) {
        textDiv.innerHTML = '';
        const paragraphs = content.split('\n').filter(p => p.trim() !== '');
        paragraphs.forEach(paragraph => {
            const p = document.createElement('p');
            p.textContent = paragraph;
            textDiv.appendChild(p);
        });

        if (paragraphs.length === 0) {
            const p = document.createElement('p');
            textDiv.appendChild(p);
        }
    }

    // 添加打字机效果
    function addTypingEffect(element) {
        const allText = element.innerHTML;
        element.innerHTML = '';
        let i = 0;

        const typeWriter = () => {
            if (i < allText.length) {
                element.innerHTML = allText.substring(0, i + 1);
                i++;
                setTimeout(typeWriter, 5);
            }
        };

        typeWriter();
    }

    // 显示错误消息
    function displayErrorMessage(errorText) {
        window.ui.showNotification(errorText, 'error');
    }

    // 文件上传处理
    function handleFileUpload(file) {
        if (!file) return;

        // 检查文件类型
        const allowedTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            displayErrorMessage('只支持.doc和.docx格式的文件');
            return;
        }

        // 检查文件大小（最大10MB）
        if (file.size > 10 * 1024 * 1024) {
            displayErrorMessage('文件大小不能超过10MB');
            return;
        }

        // 发送文件到AI进行批改
        sendMessageToAI(file, true);
    }

    // 事件监听
    sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            displayMessage(message, 'user');
            userInput.value = '';
            sendMessageToAI(message);
        }
    });

    userInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });

    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFileUpload(file);
    });

    // 拖放文件处理
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
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    });

    clearButton?.addEventListener('click', () => {
        localStorage.removeItem('homework_chat_history');
        location.reload();
    });

    themeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('homework_dark_theme',
            document.body.classList.contains('dark-theme'));
    });

    // 初始化主题
    const isDark = localStorage.getItem('homework_dark_theme') === 'true';
    document.body.classList.toggle('dark-theme', isDark);
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

    // 聚焦输入框
    userInput.focus();
});