from flask import Flask, render_template, request, jsonify, session
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import json
from DB import *
from main import chat, sql_input, sql_output

app = Flask(__name__)
app.secret_key = os.urandom(24)  # 设置会话密钥

# 文件上传配置
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'doc', 'docx'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 路由：主页
@app.route('/')
def index():
    return render_template('index.html')

# 路由：批改页面
@app.route('/correction')
def correction():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('correction.html')

# 路由：个人信息页面
@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('profile.html')

# API：用户注册
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    
    try:
        # 检查用户名是否已存在
        check_sql = "SELECT * FROM student WHERE username = %s"
        result = sql_output(check_sql, (username,))
        if result:
            return jsonify({'success': False, 'message': '用户名已存在'})
        
        # 插入新用户
        insert_sql = "INSERT INTO student (username, password, email) VALUES (%s, %s, %s) RETURNING id"
        user_id = sql_input(insert_sql, (username, password, email))
        
        session['user_id'] = user_id
        return jsonify({'success': True})
    except Exception as e:
        print(f"注册错误: {str(e)}")
        return jsonify({'success': False, 'message': '注册失败，请重试'})

# API：用户登录
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    try:
        # 验证用户名和密码
        sql = "SELECT id, password FROM student WHERE username = %s"
        result = sql_output(sql, (username,))
        
        if not result or result[0][1] != password:
            return jsonify({'success': False, 'message': '用户名或密码错误'})
        
        session['user_id'] = result[0][0]
        return jsonify({'success': True})
    except Exception as e:
        print(f"登录错误: {str(e)}")
        return jsonify({'success': False, 'message': '登录失败，请重试'})

# API：文件上传
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有文件'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'})
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # 保存文件记录到数据库
            sql = "INSERT INTO homework (student_id, file_name, submit_time) VALUES (%s, %s, %s) RETURNING id"
            homework_id = sql_input(sql, (session['user_id'], filename, datetime.now()))
            
            return jsonify({
                'success': True,
                'fileId': homework_id
            })
        except Exception as e:
            print(f"文件上传错误: {str(e)}")
            return jsonify({'success': False, 'message': '文件上传失败'})
    
    return jsonify({'success': False, 'message': '不支持的文件类型'})

# API：AI批改
@app.route('/api/correct', methods=['POST'])
def correct_homework():
    data = request.get_json()
    homework_id = data.get('fileId')
    
    try:
        # 获取作业文件信息
        sql = "SELECT file_name FROM homework WHERE id = %s"
        result = sql_output(sql, (homework_id,))
        if not result:
            return jsonify({'success': False, 'message': '找不到作业文件'})
        
        file_name = result[0][0]
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
        
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 调用AI批改
        correction_result = chat(content)
        
        # 解析AI返回的结果
        result_dict = json.loads(correction_result)
        
        # 更新数据库中的批改结果
        update_sql = "UPDATE homework SET score = %s, feedback = %s WHERE id = %s"
        sql_input(update_sql, (result_dict['score'], result_dict['feedback'], homework_id))
        
        return jsonify({
            'success': True,
            'correction': result_dict
        })
    except Exception as e:
        print(f"批改错误: {str(e)}")
        return jsonify({'success': False, 'message': '批改失败，请重试'})

# API：AI对话
@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    data = request.get_json()
    message = data.get('message')
    
    try:
        # 调用AI对话
        response = chat(message)
        return jsonify({
            'success': True,
            'reply': response
        })
    except Exception as e:
        print(f"对话错误: {str(e)}")
        return jsonify({'success': False, 'message': '发送消息失败'})

# API：获取用户统计数据
@app.route('/api/user/stats')
def get_user_stats():
    try:
        # 获取总提交数
        total_sql = "SELECT COUNT(*) FROM homework WHERE student_id = %s"
        total_result = sql_output(total_sql, (session['user_id'],))
        total_submissions = total_result[0][0] if total_result else 0
        
        # 获取平均分数
        avg_sql = "SELECT AVG(score) FROM homework WHERE student_id = %s AND score IS NOT NULL"
        avg_result = sql_output(avg_sql, (session['user_id'],))
        average_score = float(avg_result[0][0]) if avg_result and avg_result[0][0] else 0
        
        # 获取本月提交数
        month_sql = "SELECT COUNT(*) FROM homework WHERE student_id = %s AND EXTRACT(MONTH FROM submit_time) = EXTRACT(MONTH FROM CURRENT_DATE)"
        month_result = sql_output(month_sql, (session['user_id'],))
        monthly_submissions = month_result[0][0] if month_result else 0
        
        return jsonify({
            'totalSubmissions': total_submissions,
            'averageScore': average_score,
            'monthlySubmissions': monthly_submissions
        })
    except Exception as e:
        print(f"获取统计数据错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取统计数据失败'})

# API：获取提交历史
@app.route('/api/user/submissions')
def get_user_submissions():
    try:
        sql = """
            SELECT id, file_name, 'homework' as type, submit_time, score 
            FROM homework 
            WHERE student_id = %s 
            ORDER BY submit_time DESC
        """
        results = sql_output(sql, (session['user_id'],))
        
        submissions = [{
            'id': row[0],
            'fileName': row[1],
            'type': row[2],
            'submitTime': row[3].strftime('%Y-%m-%d %H:%M:%S'),
            'score': float(row[4]) if row[4] is not None else None
        } for row in results]
        
        return jsonify(submissions)
    except Exception as e:
        print(f"获取提交历史错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取提交历史失败'})

# API：获取提交详情
@app.route('/api/submission/<int:submission_id>')
def get_submission_detail(submission_id):
    try:
        sql = """
            SELECT h.file_name, h.submit_time, 'homework' as type, h.score, h.feedback
            FROM homework h
            WHERE h.id = %s AND h.student_id = %s
        """
        result = sql_output(sql, (submission_id, session['user_id']))
        
        if not result:
            return jsonify({'success': False, 'message': '找不到提交记录'})
        
        row = result[0]
        return jsonify({
            'fileName': row[0],
            'submitTime': row[1].strftime('%Y-%m-%d %H:%M:%S'),
            'type': row[2],
            'score': float(row[3]) if row[3] is not None else None,
            'feedback': row[4],
            'suggestions': ['改进建议1', '改进建议2', '改进建议3']  # 示例数据，实际应从AI反馈中解析
        })
    except Exception as e:
        print(f"获取提交详情错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取提交详情失败'})

# API：获取分析数据
@app.route('/api/user/analysis')
def get_user_analysis():
    try:
        # 获取成绩趋势数据
        score_sql = """
            SELECT submit_time::date as date, score
            FROM homework
            WHERE student_id = %s AND score IS NOT NULL
            ORDER BY submit_time
        """
        score_results = sql_output(score_sql, (session['user_id'],))
        
        scores = [{
            'date': row[0].strftime('%Y-%m-%d'),
            'score': float(row[1])
        } for row in score_results]
        
        # 获取提交类型分布数据
        type_distribution = {
            '作业': 0,
            '测试': 0,
            '考试': 0
        }
        
        # 统计作业数量
        homework_sql = "SELECT COUNT(*) FROM homework WHERE student_id = %s"
        homework_count = sql_output(homework_sql, (session['user_id'],))[0][0]
        type_distribution['作业'] = homework_count
        
        # 统计测试数量
        test_sql = "SELECT COUNT(*) FROM test WHERE student_id = %s"
        test_count = sql_output(test_sql, (session['user_id'],))[0][0]
        type_distribution['测试'] = test_count
        
        # 统计考试数量
        exam_sql = "SELECT COUNT(*) FROM exam WHERE student_id = %s"
        exam_count = sql_output(exam_sql, (session['user_id'],))[0][0]
        type_distribution['考试'] = exam_count
        
        return jsonify({
            'scores': scores,
            'typeDistribution': type_distribution
        })
    except Exception as e:
        print(f"获取分析数据错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取分析数据失败'})

if __name__ == '__main__':
    app.run(debug=True)