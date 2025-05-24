import os
from datetime import timedelta

# 数据库配置
DB_CONFIG = {
    'database': 'finance01',
    'user': 'python0l_user48',
    'password': 'python01_user48@123',
    'host': '110.41.115.206',
    'port': 8000
}

# AI模型配置
AI_CONFIG = {
    'api_key': 'sk-824ce9b7eb7b49c4889ba57a0284a038',  # 请替换为实际的API密钥
    'base_url': 'https://api.deepseek.com',
    'model': 'deepseek-chat',
    'temperature': 0.7,  # AI回复的创造性程度（0-1）
    'max_tokens': 1000,  # 每次回复的最大标记数
    'timeout': 30  # API请求超时时间（秒）
}

# Flask应用配置
class Config:
    # 基础配置
    SECRET_KEY = os.urandom(24)
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # 数据库配置
    DB_CONFIG = DB_CONFIG
    
    # AI配置
    AI_CONFIG = AI_CONFIG
    
    # 文件上传配置
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 最大上传文件大小（10MB）
    ALLOWED_EXTENSIONS = {'doc', 'docx'}
    
    # 缓存配置
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300
    
    # 会话配置
    SESSION_TYPE = 'filesystem'
    SESSION_FILE_DIR = 'flask_session/'
    SESSION_PERMANENT = True
    
    # 日志配置
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    LOG_FILE = 'app.log'

# 开发环境配置
class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    
    # 开发环境数据库配置
    DB_CONFIG = DB_CONFIG.copy()
    
    # 开发环境AI配置
    AI_CONFIG = AI_CONFIG.copy()
    
    # 允许的跨域来源
    CORS_ORIGINS = ['http://localhost:5000']

# 测试环境配置
class TestingConfig(Config):
    DEBUG = False
    TESTING = True
    
    # 测试数据库配置（可以使用临时数据库）
    DB_CONFIG = DB_CONFIG.copy()
    DB_CONFIG['database'] = 'test_' + DB_CONFIG['database']
    
    # 测试环境AI配置
    AI_CONFIG = AI_CONFIG.copy()
    AI_CONFIG['model'] = 'deepseek-chat-test'  # 可以使用测试模型
    
    # 测试文件存储位置
    UPLOAD_FOLDER = 'test_uploads'

# 生产环境配置
class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    
    # 生产环境需要更安全的密钥
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(24)
    
    # 生产环境数据库配置
    DB_CONFIG = {
        'database': os.environ.get('DB_NAME', DB_CONFIG['database']),
        'user': os.environ.get('DB_USER', DB_CONFIG['user']),
        'password': os.environ.get('DB_PASSWORD', DB_CONFIG['password']),
        'host': os.environ.get('DB_HOST', DB_CONFIG['host']),
        'port': int(os.environ.get('DB_PORT', DB_CONFIG['port']))
    }
    
    # 生产环境AI配置
    AI_CONFIG = {
        'api_key': os.environ.get('AI_API_KEY', AI_CONFIG['api_key']),
        'base_url': os.environ.get('AI_BASE_URL', AI_CONFIG['base_url']),
        'model': os.environ.get('AI_MODEL', AI_CONFIG['model']),
        'temperature': float(os.environ.get('AI_TEMPERATURE', AI_CONFIG['temperature'])),
        'max_tokens': int(os.environ.get('AI_MAX_TOKENS', AI_CONFIG['max_tokens'])),
        'timeout': int(os.environ.get('AI_TIMEOUT', AI_CONFIG['timeout']))
    }
    
    # 生产环境安全设置
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True
    
    # 生产环境日志配置
    LOG_LEVEL = 'ERROR'
    LOG_FILE = '/var/log/aihomework/app.log'

# 错误消息配置
ERROR_MESSAGES = {
    'db_connection': '数据库连接失败，请稍后重试',
    'file_not_found': '找不到指定的文件',
    'invalid_file_type': '不支持的文件类型',
    'file_too_large': '文件大小超过限制',
    'ai_service_error': 'AI服务暂时不可用',
    'unauthorized': '请先登录',
    'forbidden': '没有权限执行此操作',
    'validation_error': '输入数据验证失败',
    'not_found': '请求的资源不存在',
    'server_error': '服务器内部错误'
}

# 系统常量配置
CONSTANTS = {
    'PASSWORD_MIN_LENGTH': 6,
    'PASSWORD_MAX_LENGTH': 20,
    'USERNAME_MIN_LENGTH': 3,
    'USERNAME_MAX_LENGTH': 20,
    'SESSION_TIMEOUT': 3600,  # 会话超时时间（秒）
    'RATE_LIMIT': 100,  # API请求限制（次/小时）
    'CACHE_TIMEOUT': 300,  # 缓存超时时间（秒）
    'DEFAULT_PAGE_SIZE': 10,  # 默认分页大小
    'MAX_PAGE_SIZE': 100,  # 最大分页大小
    'FILE_TYPES': {  # 支持的文件类型及其MIME类型
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
}

# 当前环境配置
def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    config_map = {
        'development': DevelopmentConfig,
        'testing': TestingConfig,
        'production': ProductionConfig
    }
    return config_map.get(env, DevelopmentConfig)