// ui_handler.js - UI交互处理功能
document.addEventListener('DOMContentLoaded', function() {
    // UI元素
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const notifications = document.getElementById('notifications');
    const loadingOverlay = document.getElementById('loading-overlay');
    const modalContainer = document.getElementById('modal-container');

    // UI状态
    let isSidebarOpen = true;
    let activeToasts = [];

    // 侧边栏切换
    function toggleSidebarVisibility() {
        isSidebarOpen = !isSidebarOpen;
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        toggleSidebar.innerHTML = isSidebarOpen ? 
            '<i class="fas fa-chevron-left"></i>' : 
            '<i class="fas fa-chevron-right"></i>';
    }

    // 显示通知提示
    function showNotification(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <div class="toast-progress"></div>
        `;

        notifications.appendChild(toast);
        activeToasts.push(toast);

        // 添加动画类
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 进度条动画
        const progress = toast.querySelector('.toast-progress');
        progress.style.animation = `progress ${duration}ms linear`;

        // 自动关闭
        const timeout = setTimeout(() => {
            removeToast(toast);
        }, duration);

        // 点击关闭
        toast.addEventListener('click', () => {
            clearTimeout(timeout);
            removeToast(toast);
        });

        // 限制最大显示数量
        if (activeToasts.length > 3) {
            removeToast(activeToasts[0]);
        }
    }

    // 移除通知提示
    function removeToast(toast) {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
            activeToasts = activeToasts.filter(t => t !== toast);
        });
    }

    // 获取通知图标
    function getToastIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-times-circle',
            'warning': 'fa-exclamation-circle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // 显示加载遮罩
    function showLoading(message = '加载中...') {
        loadingOverlay.querySelector('.loading-text').textContent = message;
        loadingOverlay.classList.add('active');
    }

    // 隐藏加载遮罩
    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }

    // 显示模态框
    function showModal(title, content, buttons = []) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
                <div class="modal-footer"></div>
            </div>
        `;

        // 添加按钮
        const footer = modal.querySelector('.modal-footer');
        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = `modal-button ${button.class || ''}`;
            btn.textContent = button.text;
            btn.onclick = () => {
                if (button.action) {
                    button.action();
                }
                closeModal(modal);
            };
            footer.appendChild(btn);
        });

        // 关闭按钮事件
        modal.querySelector('.close-modal').onclick = () => {
            closeModal(modal);
        };

        modalContainer.appendChild(modal);
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        return modal;
    }

    // 关闭模态框
    function closeModal(modal) {
        modal.classList.remove('show');
        modal.addEventListener('transitionend', () => {
            modal.remove();
        });
    }

    // 确认对话框
    function showConfirm(message, onConfirm, onCancel) {
        return showModal('确认', message, [
            {
                text: '取消',
                class: 'secondary',
                action: onCancel
            },
            {
                text: '确认',
                class: 'primary',
                action: onConfirm
            }
        ]);
    }

    // 提示对话框
    function showAlert(message, onClose) {
        return showModal('提示', message, [
            {
                text: '确定',
                class: 'primary',
                action: onClose
            }
        ]);
    }

    // 表单验证
    function validateForm(form, rules) {
        const errors = [];
        for (const [field, rule] of Object.entries(rules)) {
            const input = form.querySelector(`[name="${field}"]`);
            if (!input) continue;

            const value = input.value.trim();

            // 必填验证
            if (rule.required && !value) {
                errors.push(`${rule.label || field}不能为空`);
                continue;
            }

            if (value) {
                // 最小长度验证
                if (rule.minLength && value.length < rule.minLength) {
                    errors.push(`${rule.label || field}长度不能小于${rule.minLength}`);
                }

                // 最大长度验证
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push(`${rule.label || field}长度不能大于${rule.maxLength}`);
                }

                // 正则验证
                if (rule.pattern && !rule.pattern.test(value)) {
                    errors.push(rule.message || `${rule.label || field}格式不正确`);
                }

                // 自定义验证
                if (rule.validate && !rule.validate(value)) {
                    errors.push(rule.message || `${rule.label || field}验证失败`);
                }
            }
        }

        return errors;
    }

    // 事件监听
    toggleSidebar?.addEventListener('click', toggleSidebarVisibility);

    // 导出UI处理函数
    window.ui = {
        showNotification,
        showLoading,
        hideLoading,
        showModal,
        showConfirm,
        showAlert,
        validateForm
    };
});