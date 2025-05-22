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
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const closeBtns = document.querySelectorAll('.close-btn');

    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const modalId = trigger.getAttribute('data-modal');
            const modal = document.querySelector(modalId);
            if (modal) {
                modal.style.display = 'block';
            }
        });
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
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;
            const formData = new FormData(form);

            // 验证必填字段
            form.querySelectorAll('[required]').forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    showError(field, '此字段为必填项');
                } else {
                    clearError(field);
                }
            });

            // 验证邮箱格式
            const emailField = form.querySelector('input[type="email"]');
            if (emailField && emailField.value) {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(emailField.value)) {
                    isValid = false;
                    showError(emailField, '请输入有效的邮箱地址');
                }
            }

            // 验证密码长度
            const passwordField = form.querySelector('input[type="password"]');
            if (passwordField && passwordField.value) {
                if (passwordField.value.length < 6) {
                    isValid = false;
                    showError(passwordField, '密码长度至少为6个字符');
                }
            }

            if (isValid) {
                // 在这里添加表单提交逻辑
                console.log('表单验证通过，准备提交数据');
                const formObject = {};
                formData.forEach((value, key) => {
                    formObject[key] = value;
                });
                submitForm(formObject, form.getAttribute('action'));
            }
        });
    });

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
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('网络响应出错');
            }

            const result = await response.json();
            if (result.success) {
                showMessage('success', '操作成功！');
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
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-toast ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.padding = '15px 25px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.backgroundColor = type === 'success' ? '#2ecc71' : '#e74c3c';
        messageDiv.style.color = '#fff';
        messageDiv.style.zIndex = '1000';
        messageDiv.style.transition = 'opacity 0.3s';

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        }, 3000);
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