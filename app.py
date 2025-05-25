from flask import Flask, render_template, request, jsonify, session, url_for, redirect
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import json
from docx import Document
from DB import *
from main import chat, sql_input, sql_output, process_homework # Import process_homework
from config import Config, DevelopmentConfig, ProductionConfig # Import config classes

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Load configuration based on environment (e.g., FLASK_ENV)
flask_env = os.environ.get('FLASK_ENV', 'development')
if flask_env == 'production':
    app.config.from_object(ProductionConfig)
else:
    app.config.from_object(DevelopmentConfig)

# Ensure UPLOAD_FOLDER exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

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
    username = data.get('username')  # 学号
    password = data.get('password')
    name = data.get('name')
    class_name = data.get('class')  # Corrected: Use 'class' field for class name
    # 验证必填字段
    if not all([username, password, name, class_name]):
        return jsonify({'success': False, 'message': '所有字段都是必填的'})
    
    try:
        # 检查学号是否已存在
        check_sql = "SELECT * FROM student WHERE username = %s"
        result = sql_output(check_sql, (username,))
        if result:
            return jsonify({'success': False, 'message': '该学号已被注册'})
        
        # 插入新用户
        insert_sql = "INSERT INTO student (username, password, name, class) VALUES (%s, %s, %s, %s) RETURNING id"
        user_id = sql_input(insert_sql, (username, password, name, class_name))
        
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

# API：文件上传和初步批改 (Renamed from /api/upload and integrated /api/correct logic)
@app.route('/api/upload_homework', methods=['POST'])
def upload_homework_and_correct():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '用户未登录'}), 401

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有文件部分'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'})
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            # Ensure unique filenames to prevent overwrites, e.g., by prefixing with timestamp or UUID
            unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            # Read Word document content
            doc = Document(file_path)
            content = '\n'.join([paragraph.text for paragraph in doc.paragraphs])

            # At this point, we need to create a homework record BEFORE processing
            # so that process_homework can update it.
            # Let's assume student_id is in session.
            student_id = session['user_id']

            # Create initial homework record (status 'pending' or similar)
            # The process_homework function in main.py expects to UPDATE an existing record.
            # We need to decide if process_homework creates or updates.
            # For now, let's adjust app.py to align with main.py's process_homework logic
            # which implies an existing record to update.

            # Create a placeholder homework entry first
            insert_homework_sql = """
            INSERT INTO homework (student_id, file_name, submit_time, status)
            VALUES (%s, %s, %s, %s) RETURNING id
            """
            # Storing a summary or the full content might be useful for re-processing or display
            # For now, let's just store a placeholder for content_summary
            content_summary_placeholder = content[:200] + '...' if len(content) > 200 else content
            
            homework_id = sql_input(insert_homework_sql, 
                                    (student_id, unique_filename, datetime.now(), 'pending'))

            if not homework_id:
                return jsonify({'success': False, 'message': '创建作业记录失败'})

            # Now call process_homework with the content and student_id (or homework_id)
            # Modifying process_homework to take homework_id might be cleaner.
            # For now, assuming process_homework uses student_id and updates the LATEST 'pending' homework for that student.
            # This is a potential issue if a student uploads multiple files quickly.
            # A better approach: pass homework_id to process_homework.
            
            # Let's assume process_homework is modified to take homework_id:
            # result = process_homework(content, homework_id) # Ideal change in main.py

            # Current main.py/process_homework uses student_id and updates based on student_id and 'pending' status.
            # This is problematic. Let's simulate what it would do, but flag this for review.
            # For the purpose of this step, we'll call it with content and student_id as it is.
            # The `process_homework` function in `main.py` will then look for a pending homework for this student.
            
            # Call process_homework (from main.py)
            # This function will perform AI correction and update the DB record it finds (based on student_id and status='pending')
            # correction_data = process_homework(content, student_id) # student_id from session # OLD CALL
            correction_data = process_homework(content, homework_id) # NEW CALL with homework_id

            if correction_data.get('success'):
                return jsonify({
                    'success': True,
                    'message': '文件上传成功并已提交批改。',
                    'homework_id': correction_data.get('homework_id'), # process_homework should return this
                    'correction': correction_data.get('correction')
                })
            else:
                # Even if AI processing fails, the file is uploaded. 
                # The status in DB would remain 'pending' or become 'error_processing'
                return jsonify({
                    'success': False, 
                    'message': correction_data.get('message', 'AI批改失败，但文件已上传。'),
                    'homework_id': homework_id # Return the ID of the created homework record
                    })

        except Exception as e:
            # Log the full error for debugging
            app.logger.error(f"文件上传或批改错误: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'message': f'文件上传或处理失败: {str(e)}'})
    
    return jsonify({'success': False, 'message': '不支持的文件类型或文件上传失败'})

# API：AI对话 (This route seems fine as is)
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

# API：获取当前用户信息
@app.route('/api/user/info')
def get_user_info():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '用户未登录'}), 401
    
    try:
        sql = "SELECT id, username, name, class FROM student WHERE id = %s"
        result = sql_output(sql, (session['user_id'],))
        
        if not result:
            return jsonify({'success': False, 'message': '用户不存在'})
        
        user = result[0]
        return jsonify({
            'success': True,
            'user': {
                'id': user[0],
                'username': user[1],
                'name': user[2],
                'class': user[3]
            }
        })
    except Exception as e:
        print(f"获取用户信息错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取用户信息失败'})

# API：用户登出
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': '登出成功'})

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
