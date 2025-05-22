import os
import logging
import hashlib
import re
from datetime import datetime
from functools import wraps
from flask import request, jsonify, session
from config import get_config, ERROR_MESSAGES, CONSTANTS

# 配置日志记录
config = get_config()
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format=config.LOG_FORMAT,
    filename=config.LOG_FILE
)
logger = logging.getLogger(__name__)

def setup_logger(name):
    """创建并配置logger实例"""
    logger = logging.getLogger(name)
    handler = logging.FileHandler(config.LOG_FILE)
    handler.setFormatter(logging.Formatter(config.LOG_FORMAT))
    logger.addHandler(handler)
    logger.setLevel(getattr(logging, config.LOG_LEVEL))
    return logger

def allowed_file(filename):
    """检查文件类型是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS

def secure_filename(filename):
    """生成安全的文件名"""
    # 移除文件名中的非法字符
    filename = re.sub(r'[^\w\s.-]', '', filename)
    # 添加时间戳前缀确保唯一性
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
    return timestamp + filename

def hash_password(password):
    """密码加密"""
    salt = os.urandom(16)
    hash_obj = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000
    )
    return salt + hash_obj

def verify_password(stored_password, provided_password):
    """验证密码"""
    salt = stored_password[:16]
    stored_hash = stored_password[16:]
    hash_obj = hashlib.pbkdf2_hmac(
        'sha256',
        provided_password.encode('utf-8'),
        salt,
        100000
    )
    return hash_obj == stored_hash

def validate_input(data, rules):
    """验证输入数据"""
    errors = []
    for field, rule in rules.items():
        value = data.get(field)
        
        # 检查必填字段
        if rule.get('required', False) and not value:
            errors.append(f'{field}是必填项')
            continue
            
        if value:
            # 检查长度
            if 'min_length' in rule and len(value) < rule['min_length']:
                errors.append(f'{field}长度不能小于{rule["min_length"]}')
            if 'max_length' in rule and len(value) > rule['max_length']:
                errors.append(f'{field}长度不能大于{rule["max_length"]}')
                
            # 检查格式
            if 'pattern' in rule and not re.match(rule['pattern'], value):
                errors.append(f'{field}格式不正确')
                
            # 检查类型
            if 'type' in rule:
                try:
                    if rule['type'] == 'int':
                        int(value)
                    elif rule['type'] == 'float':
                        float(value)
                    elif rule['type'] == 'bool':
                        isinstance(value, bool)
                except (ValueError, TypeError):
                    errors.append(f'{field}类型不正确')
    
    return errors

def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': ERROR_MESSAGES['unauthorized']
            }), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """管理员权限验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or not session.get('is_admin'):
            return jsonify({
                'success': False,
                'message': ERROR_MESSAGES['forbidden']
            }), 403
        return f(*args, **kwargs)
    return decorated_function

def rate_limit(f):
    """API请求频率限制装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 获取用户IP
        ip = request.remote_addr
        # 获取当前时间戳
        now = datetime.now().timestamp()
        # 获取用户请求历史
        request_history = session.get('request_history', {})
        
        # 清理过期的请求记录
        request_history = {ts: count for ts, count in request_history.items()
                          if now - float(ts) < 3600}  # 保留1小时内的记录
        
        # 计算总请求次数
        total_requests = sum(request_history.values())
        
        if total_requests >= CONSTANTS['RATE_LIMIT']:
            return jsonify({
                'success': False,
                'message': '请求过于频繁，请稍后再试'
            }), 429
        
        # 更新请求历史
        current_minute = str(int(now))
        request_history[current_minute] = request_history.get(current_minute, 0) + 1
        session['request_history'] = request_history
        
        return f(*args, **kwargs)
    return decorated_function

def format_response(success, message=None, data=None):
    """格式化API响应"""
    response = {'success': success}
    if message:
        response['message'] = message
    if data is not None:
        response['data'] = data
    return jsonify(response)

def paginate(query_results, page, per_page=None):
    """分页处理"""
    if per_page is None:
        per_page = CONSTANTS['DEFAULT_PAGE_SIZE']
    
    # 确保页码和每页数量在合理范围内
    page = max(1, page)
    per_page = min(max(1, per_page), CONSTANTS['MAX_PAGE_SIZE'])
    
    # 计算总页数和记录总数
    total_items = len(query_results)
    total_pages = (total_items + per_page - 1) // per_page
    
    # 获取当前页的数据
    start = (page - 1) * per_page
    end = start + per_page
    items = query_results[start:end]
    
    return {
        'items': items,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages,
        'total_items': total_items
    }

def get_file_extension(filename):
    """获取文件扩展名"""
    return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

def get_mime_type(filename):
    """获取文件MIME类型"""
    ext = get_file_extension(filename)
    return CONSTANTS['FILE_TYPES'].get(ext)

def create_directory_if_not_exists(directory):
    """创建目录（如果不存在）"""
    if not os.path.exists(directory):
        os.makedirs(directory)

def cleanup_old_files(directory, max_age_days=7):
    """清理指定目录中的过期文件"""
    now = datetime.now()
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            # 获取文件的最后修改时间
            mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
            # 如果文件超过指定天数，则删除
            if (now - mtime).days > max_age_days:
                try:
                    os.remove(filepath)
                    logger.info(f'已删除过期文件：{filepath}')
                except Exception as e:
                    logger.error(f'删除文件失败：{filepath}, 错误：{str(e)}')

def init_app_directories(app):
    """初始化应用所需的目录"""
    # 创建上传文件目录
    create_directory_if_not_exists(app.config['UPLOAD_FOLDER'])
    # 创建会话文件目录
    create_directory_if_not_exists(app.config['SESSION_FILE_DIR'])
    # 创建日志目录
    log_dir = os.path.dirname(app.config['LOG_FILE'])
    create_directory_if_not_exists(log_dir)