document.addEventListener('DOMContentLoaded', function() {
    // 选项卡切换
    const menuItems = document.querySelectorAll('.profile-menu li');
    const tabs = document.querySelectorAll('.profile-tab');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有活动状态
            menuItems.forEach(i => i.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));

            // 添加当前项的活动状态
            item.classList.add('active');
            const tabId = item.getAttribute('data-tab');
            document.querySelector(`#${tabId}`).classList.add('active');

            // 如果是概览选项卡，加载统计数据
            if (tabId === 'overview') {
                loadOverviewStats();
            }
            // 如果是提交记录选项卡，加载提交历史
            else if (tabId === 'submissions') {
                loadSubmissionHistory();
            }
            // 如果是学习分析选项卡，加载分析图表
            else if (tabId === 'analysis') {
                loadAnalysisCharts();
            }
        });
    });

    // 默认加载概览数据
    loadOverviewStats();

    // 加载概览统计数据
    async function loadOverviewStats() {
        try {
            const response = await fetch('/api/user/stats');
            if (!response.ok) {
                throw new Error('获取统计数据失败');
            }

            const stats = await response.json();
            updateOverviewStats(stats);
        } catch (error) {
            console.error('加载统计数据出错:', error);
            showMessage('error', '加载统计数据失败');
        }
    }

    // 更新概览统计数据
    function updateOverviewStats(stats) {
        const statsContainer = document.querySelector('.overview-stats');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="stat-info">
                    <h4>总提交数</h4>
                    <p>${stats.totalSubmissions}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <h4>平均分数</h4>
                    <p>${stats.averageScore.toFixed(1)}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h4>本月提交</h4>
                    <p>${stats.monthlySubmissions}</p>
                </div>
            </div>
        `;
    }

    // 加载提交历史
    async function loadSubmissionHistory() {
        try {
            const response = await fetch('/api/user/submissions');
            if (!response.ok) {
                throw new Error('获取提交历史失败');
            }

            const submissions = await response.json();
            displaySubmissionHistory(submissions);
        } catch (error) {
            console.error('加载提交历史出错:', error);
            showMessage('error', '加载提交历史失败');
        }
    }

    // 显示提交历史
    function displaySubmissionHistory(submissions) {
        const tableBody = document.querySelector('.submission-table tbody');
        tableBody.innerHTML = submissions.map(submission => `
            <tr>
                <td>${submission.fileName}</td>
                <td>${submission.type}</td>
                <td>${submission.submitTime}</td>
                <td>${submission.score}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="viewDetail('${submission.id}')">
                        查看详情
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 查看提交详情
    window.viewDetail = async function(submissionId) {
        try {
            const response = await fetch(`/api/submission/${submissionId}`);
            if (!response.ok) {
                throw new Error('获取提交详情失败');
            }

            const detail = await response.json();
            showSubmissionDetail(detail);
        } catch (error) {
            console.error('加载提交详情出错:', error);
            showMessage('error', '加载提交详情失败');
        }
    };

    // 显示提交详情模态框
    function showSubmissionDetail(detail) {
        const modalContent = `
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                <h3>提交详情</h3>
                <div class="detail-content">
                    <div class="detail-item">
                        <h4>文件信息</h4>
                        <p>文件名：${detail.fileName}</p>
                        <p>提交时间：${detail.submitTime}</p>
                        <p>类型：${detail.type}</p>
                    </div>
                    <div class="detail-item">
                        <h4>评分详情</h4>
                        <p>得分：${detail.score}</p>
                        <p>评价：${detail.feedback}</p>
                    </div>
                    <div class="detail-item">
                        <h4>改进建议</h4>
                        <ul>
                            ${detail.suggestions.map(suggestion => 
                                `<li>${suggestion}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);

        // 关闭模态框
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    // 加载分析图表
    async function loadAnalysisCharts() {
        try {
            const response = await fetch('/api/user/analysis');
            if (!response.ok) {
                throw new Error('获取分析数据失败');
            }

            const data = await response.json();
            createScoreChart(data.scores);
            createTypeDistributionChart(data.typeDistribution);
        } catch (error) {
            console.error('加载分析图表出错:', error);
            showMessage('error', '加载分析图表失败');
        }
    }

    // 创建成绩趋势图表
    function createScoreChart(scores) {
        const ctx = document.getElementById('scoreChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: scores.map(s => s.date),
                datasets: [{
                    label: '成绩趋势',
                    data: scores.map(s => s.score),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    // 创建提交类型分布图表
    function createTypeDistributionChart(distribution) {
        const ctx = document.getElementById('typeChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(distribution),
                datasets: [{
                    data: Object.values(distribution),
                    backgroundColor: [
                        '#3498db',
                        '#2ecc71',
                        '#e74c3c',
                        '#f1c40f'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // 消息提示
    function showMessage(type, message) {
        window.ui.showNotification(message, type);
    }
});