// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 导航栏固定效果
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 导航链接高亮
    const navLinks = document.querySelectorAll('.nav a');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // 模态框控制
    const modals = document.querySelectorAll('.modal');
    const loginBtn = document.querySelector('#loginBtn');
    const registerBtn = document.querySelector('#registerBtn');
    const closeBtns = document.querySelectorAll('.close-btn');

    // 登录按钮点击事件
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#loginModal').style.display = 'block';
    });

    // 注册按钮点击事件
    registerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#registerModal').style.display = 'block';
    });



    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // 表单验证
    function validateForm(form) {
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                showError(input, '此字段为必填项');
                isValid = false;
            } else {
                clearError(input);
            }
        });
        
        // 班级格式验证
        const classInput = form.querySelector('input[name="class_name"]');
        if (classInput && classInput.value) {
            const classPattern = /^\d{4}级[\u4e00-\u9fa5]+\d+班$/;
            if (!classPattern.test(classInput.value)) {
                showError(classInput, '班级格式不正确，例如：2023级计算机1班');
                isValid = false;
            }
        }
        
        // 密码验证
        const passwordInput = form.querySelector('input[name="password"]');
        const confirmPasswordInput = form.querySelector('input[name="confirm_password"]');
        
        if (passwordInput && passwordInput.value.length < 6) {
            showError(passwordInput, '密码长度至少6位');
            isValid = false;
        }
        
        if (confirmPasswordInput && passwordInput.value !== confirmPasswordInput.value) {
            showError(confirmPasswordInput, '两次输入的密码不一致');
            isValid = false;
        }
        
        return isValid;
    }

    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validateForm(form)) {
                return;
            }
            
            const formData = new FormData(form);
            const action = form.action;
            
            try {
                const response = await fetch(action, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage('success', result.message);
                    if (action.includes('login')) {
                        // 登录成功后刷新页面
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else if (action.includes('register')) {
                        // 注册成功后切换到登录表单
                        closeModal('register-modal');
                        openModal('login-modal');
                        form.reset(); // 清空注册表单
                    }
                } else {
                    showMessage('error', result.message);
                }
            } catch (error) {
                console.error('表单提交错误:', error);
                showMessage('error', '提交失败，请稍后重试');
            }
        });
    });
    
    // 错误显示函数
    function showError(input, message) {
        clearError(input);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
        input.classList.add('error');
    }
    
    // 清除错误函数
    function clearError(input) {
        const errorDiv = input.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        input.classList.remove('error');
    }
    
    // 消息显示函数
    function showMessage(type, message) {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // 添加到页面顶部
        document.body.insertBefore(messageDiv, document.body.firstChild);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    // 显示错误信息
    function showError(field, message) {
        const errorDiv = field.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.textContent = message;
        } else {
            const div = document.createElement('div');
            div.className = 'error-message';
            div.textContent = message;
            div.style.color = '#e74c3c';
            div.style.fontSize = '14px';
            div.style.marginTop = '5px';
            field.parentNode.insertBefore(div, field.nextSibling);
        }
        field.style.borderColor = '#e74c3c';
    }

    // 清除错误信息
    function clearError(field) {
        const errorDiv = field.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.remove();
        }
        field.style.borderColor = '';
    }

    // 提交表单数据
    async function submitForm(data, endpoint) {
        try {
            // 根据表单类型处理数据
            let processedData = {};
            if (endpoint === '/api/login') {
                processedData = {
                    username: data.loginId,
                    password: data.loginPassword
                };
            } else if (endpoint === '/api/register') {
                processedData = {
                    username: data.registerId,
                    password: data.registerPassword,
                    name: data.registerName,
                    class: data.registerClass
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(processedData)
            });

            if (!response.ok) {
                throw new Error('网络响应出错');
            }

            const result = await response.json();
            if (result.success) {
                showMessage('success', '操作成功！');
                // 关闭模态框
                const modal = document.querySelector('.modal[style*="display: block"]');
                if (modal) {
                    modal.style.display = 'none';
                }
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showMessage('error', result.message || '操作失败，请重试');
            }
        } catch (error) {
            console.error('提交表单时出错:', error);
            showMessage('error', '提交失败，请稍后重试');
        }
    }

    // 显示消息提示
    function showMessage(type, message) {
        // Assuming window.ui.showNotification is defined elsewhere (e.g., in script.js or inline in HTML)
        if (window.ui && typeof window.ui.showNotification === 'function') {
            window.ui.showNotification(message, type);
        } else {
            // Fallback to a simple alert if the custom notification function is not available
            alert(`${type.toUpperCase()}: ${message}`);
            console.warn('window.ui.showNotification is not defined. Using alert as a fallback.');
        }
    }

    // 文件上传处理
    const fileUploadForm = document.querySelector('#fileUploadForm');
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const fileInput = this.querySelector('input[type="file"]');
            const file = fileInput.files[0];

            if (!file) {
                showMessage('error', '请选择要上传的文件');
                return;
            }

            // Basic file type validation (can be expanded)
            const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']; // .docx
            if (!allowedTypes.includes(file.type)) {
                showMessage('error', '仅支持上传 Word 文档 (.docx)');
                return;
            }

            // Add student_id to formData if available (e.g., from a hidden input or session)
            // For now, let's assume it's hardcoded or will be handled by the server session
            // formData.append('student_id', 'some_student_id'); 

            try {
                const response = await fetch('/api/upload_homework', {
                    method: 'POST',
                    body: formData // FormData will be sent as multipart/form-data
                });

                const result = await response.json();
                if (result.success) {
                    showMessage('success', result.message || '文件上传成功！正在批改...');
                    // Optionally, trigger AI chat or display correction results here
                    if (result.correction) {
                        displayCorrection(result.correction);
                    }
                } else {
                    showMessage('error', result.message || '文件上传失败');
                }
            } catch (error) {
                console.error('文件上传时出错:', error);
                showMessage('error', '文件上传失败，请稍后重试');
            }
        });
    }

    // 显示批改结果 (示例函数，需要根据实际HTML结构调整)
    function displayCorrection(correction) {
        const correctionDiv = document.querySelector('#correctionResult'); // Assume an element with this ID exists
        if (correctionDiv) {
            correctionDiv.innerHTML = `
                <h3>批改结果</h3>
                <p><strong>分数:</strong> ${correction.score}</p>
                <p><strong>评价:</strong> ${correction.feedback}</p>
                <p><strong>建议:</strong></p>
                <ul>
                    ${correction.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            `;
            correctionDiv.style.display = 'block';
        }
    }

    // AI聊天交互
    const chatForm = document.querySelector('#chatForm');
    const chatMessagesContainer = document.querySelector('#chatMessages'); // Assume a container for messages
    const chatInput = document.querySelector('#chatInput');

    if (chatForm && chatMessagesContainer && chatInput) {
        chatForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const userMessage = chatInput.value.trim();
            if (!userMessage) return;

            appendMessage('user', userMessage);
            chatInput.value = ''; // Clear input

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: userMessage })
                });

                const result = await response.json();
                if (result.success && result.reply) {
                    appendMessage('ai', result.reply);
                    // If the AI reply is a JSON string with correction details, parse and display it
                    try {
                        const aiCorrection = JSON.parse(result.reply); 
                        if (aiCorrection.score !== undefined && aiCorrection.feedback) {
                           // This indicates a correction-like response, you might want to display it differently
                           // For now, just appending the raw JSON string as AI's message
                           // Or, you could call displayCorrection(aiCorrection) if the structure matches
                        }
                    } catch (e) {
                        // Not a JSON string, or not the expected correction format, just display as plain text
                    }
                } else {
                    appendMessage('ai', result.message || '抱歉，无法获取回复。');
                }
            } catch (error) {
                console.error('AI聊天时出错:', error);
                appendMessage('ai', '与AI通信失败，请稍后重试。');
            }
        });
    }

    function appendMessage(sender, messageContent) {
        if (!chatMessagesContainer) return;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', `${sender}-message`);
        
        // If messageContent is an object (like a parsed JSON from AI), stringify it or format it
        let displayMessage = messageContent;
        if (typeof messageContent === 'object') {
            // Basic formatting for object/JSON display
            displayMessage = `<pre>${JSON.stringify(messageContent, null, 2)}</pre>`;
        } else {
            // Escape HTML to prevent XSS if displaying plain text directly
            const tempDiv = document.createElement('div');
            tempDiv.textContent = messageContent;
            displayMessage = tempDiv.innerHTML;
        }

        messageDiv.innerHTML = displayMessage;
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Scroll to bottom
    }

    // 特性卡片动画
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
});