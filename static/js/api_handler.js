// api_handler.js - API通信处理功能
class APIHandler {
    constructor() {
        this.baseURL = window.location.origin;
        this.endpoints = {
            upload: '/api/upload_homework',
            correct: '/api/correct',
            chat: '/api/chat',
            history: '/api/history',
            stats: '/api/stats'
        };
    }

    // 生成完整的API URL
    getURL(endpoint) {
        return `${this.baseURL}${this.endpoints[endpoint]}`;
    }

    // 处理API响应
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                message: '服务器错误'
            }));
            throw new Error(error.message || '请求失败');
        }
        return response;
    }

    // 上传文件
    async uploadFile(file, onProgress) {
        const formData = new FormData();
        formData.append('file', file);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', this.getURL('upload'));

            // 进度监听
            if (onProgress) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const progress = Math.round((e.loaded * 100) / e.total);
                        onProgress(progress);
                    }
                };
            }

            // 完成处理
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('解析响应失败'));
                    }
                } else {
                    reject(new Error('上传失败'));
                }
            };

            // 错误处理
            xhr.onerror = () => {
                reject(new Error('网络错误'));
            };

            xhr.send(formData);
        });
    }

    // 获取作业批改结果
    async getCorrection(homeworkId) {
        try {
            const response = await fetch(this.getURL('correct'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ homework_id: homeworkId })
            });

            return this.handleResponse(response);
        } catch (error) {
            throw new Error('获取批改结果失败: ' + error.message);
        }
    }

    // 发送聊天消息
    async sendChatMessage(message) {
        try {
            const response = await fetch(this.getURL('chat'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            return this.handleResponse(response);
        } catch (error) {
            throw new Error('发送消息失败: ' + error.message);
        }
    }

    // 获取历史记录
    async getHistory(page = 1, perPage = 10) {
        try {
            const response = await fetch(
                `${this.getURL('history')}?page=${page}&per_page=${perPage}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return this.handleResponse(response);
        } catch (error) {
            throw new Error('获取历史记录失败: ' + error.message);
        }
    }

    // 获取统计数据
    async getStats() {
        try {
            const response = await fetch(this.getURL('stats'), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return this.handleResponse(response);
        } catch (error) {
            throw new Error('获取统计数据失败: ' + error.message);
        }
    }

    // 处理流式响应
    async handleStreamResponse(response, onChunk, onError, onComplete) {
        try {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                while (buffer.indexOf('\n') >= 0) {
                    const lineEnd = buffer.indexOf('\n');
                    const line = buffer.slice(0, lineEnd);
                    buffer = buffer.slice(lineEnd + 1);

                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            onComplete && onComplete();
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            onChunk && onChunk(parsed);
                        } catch (e) {
                            console.error('解析数据块失败:', e);
                        }
                    }
                }
            }

            // 处理剩余的buffer
            if (buffer.length > 0) {
                try {
                    const parsed = JSON.parse(buffer);
                    onChunk && onChunk(parsed);
                } catch (e) {
                    console.error('解析最后的数据块失败:', e);
                }
            }

            onComplete && onComplete();

        } catch (error) {
            onError && onError(error);
            throw error;
        }
    }

    // 调用 DeepSeek AI API (流式)
    async callDeepSeekAI(messages, onChunk, onError, onComplete) {
        try {
            const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk-auaopkdytwqxmfmaevxuikiwfefsjfsxwivkysvxjkqybevq' // 使用用户提供的API Key
                },
                body: JSON.stringify({
                    model: "Pro/deepseek-ai/DeepSeek-V3", // 使用用户指定的模型
                    messages: messages,
                    stream: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API请求失败，状态码: ${response.status}` }));
                throw new Error(errorData.message || `API请求失败，状态码: ${response.status}`);
            }

            await this.handleStreamResponse(response, onChunk, onError, onComplete);

        } catch (error) {
            console.error('DeepSeek API 调用失败:', error);
            if (onError) {
                onError(error);
            } else {
                throw error; // 如果没有自定义错误处理器，则重新抛出错误
            }
        }
    }

    // 发送流式请求
    async sendStreamRequest(endpoint, data, onChunk, onError, onComplete) {
        try {
            const response = await fetch(this.getURL(endpoint), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            await this.handleStreamResponse(response, onChunk, onError, onComplete);

        } catch (error) {
            onError && onError(error);
            throw error;
        }
    }
}

// 创建全局API处理实例
const api = new APIHandler();

// 导出API处理实例
window.api = api;