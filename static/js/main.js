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

            // 验证班级格式
            const classField = form.querySelector('#registerClass');
            if (classField && classField.value) {
                if (classField.value.length > 50) {
                    isValid = false;
                    showError(classField, '班级名称不能超过50个字符');
                }
            }

            // 验证密码长度和一致性
            const passwordField = form.querySelector('input[type="password"]');
            if (passwordField && passwordField.value) {
                if (passwordField.value.length < 6) {
                    isValid = false;
                    showError(passwordField, '密码长度至少为6个字符');
                }

                // 如果是注册表单，验证确认密码
                if (form.id === 'registerForm') {
                    const confirmPasswordField = form.querySelector('#confirmPassword');
                    if (confirmPasswordField && confirmPasswordField.value !== passwordField.value) {
                        isValid = false;
                        showError(confirmPasswordField, '两次输入的密码不一致');
                    }
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
        window.ui.showNotification(message, type);
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