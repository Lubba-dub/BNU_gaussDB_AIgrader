from flask import Flask, render_template, request, jsonify, session, url_for, redirect
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import json
from docx import Document
from DB import *
from main import chat, sql_input, sql_output, process_homework # Import process_homework
from config import Config, DevelopmentConfig, ProductionConfig # Import config classes

app = Flask(__name__)

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

# API：文件上传和批改
@app.route('/api/upload_homework', methods=['POST'])
def upload_homework_and_correct():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '用户未登录'}), 401

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有文件部分'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'})
    
    # 获取文档类型
    doc_type = request.form.get('doc_type', 'homework')
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            # 读取Word文档内容
            doc = Document(file_path)
            content = '\n'.join([paragraph.text for paragraph in doc.paragraphs])
            
            if not content.strip():
                return jsonify({'success': False, 'message': '文档内容为空，请检查文件'})

            student_id = session['user_id']
            content_summary = content[:200] + '...' if len(content) > 200 else content
            
            # 根据文档类型选择对应的表
            if doc_type == 'homework':
                insert_sql = """
                INSERT INTO homework (student_id, file_name, submit_time, status, content_summary, doc_type)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                """
            elif doc_type == 'test':
                insert_sql = """
                INSERT INTO test (student_id, title, content, submit_time, status)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
                """
            elif doc_type == 'exam':
                insert_sql = """
                INSERT INTO exam (student_id, title, content, submit_time, status)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
                """
            else:
                return jsonify({'success': False, 'message': '不支持的文档类型'})
            
            # 插入记录
            if doc_type == 'homework':
                record_id = sql_input(insert_sql, 
                    (student_id, unique_filename, datetime.now(), 'pending', content_summary, doc_type))
            else:
                record_id = sql_input(insert_sql, 
                    (student_id, filename, content, datetime.now(), 'pending'))

            if not record_id:
                return jsonify({'success': False, 'message': '创建记录失败'})

            # 调用AI批改
            correction_data = process_homework(content, record_id, doc_type)

            if correction_data.get('success'):
                return jsonify({
                    'success': True,
                    'message': '文件上传成功并已完成批改',
                    'record_id': record_id,
                    'doc_type': doc_type,
                    'correction': correction_data.get('correction')
                })
            else:
                return jsonify({
                    'success': False, 
                    'message': correction_data.get('message', 'AI批改失败，但文件已上传'),
                    'record_id': record_id
                })

        except Exception as e:
            app.logger.error(f"文件上传或批改错误: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'message': f'文件处理失败: {str(e)}'})
    
    return jsonify({'success': False, 'message': '不支持的文件类型'})

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

# API：获取用户信息
@app.route('/api/user/info')
def get_user_info():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '用户未登录'}), 401
    
    try:
        sql = "SELECT username, name, class FROM student WHERE id = %s"
        result = sql_output(sql, (session['user_id'],))
        
        if result:
            user_info = result[0]
            return jsonify({
                'success': True,
                'username': user_info[0],
                'name': user_info[1],
                'class': user_info[2]
            })
        else:
            return jsonify({'success': False, 'message': '用户信息不存在'})
    except Exception as e:
        print(f"获取用户信息错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取用户信息失败'})

# API：获取用户统计数据
@app.route('/api/user/stats')
def get_user_stats():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '用户未登录'}), 401
        
    try:
        student_id = session['user_id']
        
        # 获取作业统计
        homework_sql = "SELECT COUNT(*), AVG(score) FROM homework WHERE student_id = %s"
        homework_result = sql_output(homework_sql, (student_id,))
        homework_count = homework_result[0][0] if homework_result else 0
        homework_avg = float(homework_result[0][1]) if homework_result and homework_result[0][1] else 0
        
        # 获取测试统计
        test_sql = "SELECT COUNT(*), AVG(score) FROM test WHERE student_id = %s"
        test_result = sql_output(test_sql, (student_id,))
        test_count = test_result[0][0] if test_result else 0
        test_avg = float(test_result[0][1]) if test_result and test_result[0][1] else 0
        
        # 获取考试统计
        exam_sql = "SELECT COUNT(*), AVG(score) FROM exam WHERE student_id = %s"
        exam_result = sql_output(exam_sql, (student_id,))
        exam_count = exam_result[0][0] if exam_result else 0
        exam_avg = float(exam_result[0][1]) if exam_result and exam_result[0][1] else 0
        
        # 计算总体平均分
        total_submissions = homework_count + test_count + exam_count
        if total_submissions > 0:
            total_score = (homework_avg * homework_count + test_avg * test_count + exam_avg * exam_count)
            average_score = total_score / total_submissions
        else:
            average_score = 0
        
        return jsonify({
            'homeworkCount': homework_count,
            'testCount': test_count,
            'examCount': exam_count,
            'totalSubmissions': total_submissions,
            'averageScore': round(average_score, 1)
        })
    except Exception as e:
        print(f"获取统计数据错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取统计数据失败'})

# API：获取提交历史
@app.route('/api/user/submissions')
def get_user_submissions():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '用户未登录'}), 401
        
    try:
        student_id = session['user_id']
        submissions = []
        
        # 获取作业记录
        homework_sql = """
            SELECT id, file_name, 'homework' as type, submit_time, score, status
            FROM homework 
            WHERE student_id = %s
        """
        homework_results = sql_output(homework_sql, (student_id,))
        if homework_results:
            for row in homework_results:
                submissions.append({
                    'id': row[0],
                    'fileName': row[1],
                    'type': row[2],
                    'submitTime': row[3].strftime('%Y-%m-%d %H:%M:%S'),
                    'score': float(row[4]) if row[4] is not None else None,
                    'status': row[5]
                })
        
        # 获取测试记录
        test_sql = """
            SELECT id, title, 'test' as type, submit_time, score, status
            FROM test 
            WHERE student_id = %s
        """
        test_results = sql_output(test_sql, (student_id,))
        if test_results:
            for row in test_results:
                submissions.append({
                    'id': row[0],
                    'fileName': row[1],
                    'type': row[2],
                    'submitTime': row[3].strftime('%Y-%m-%d %H:%M:%S'),
                    'score': float(row[4]) if row[4] is not None else None,
                    'status': row[5]
                })
        
        # 获取考试记录
        exam_sql = """
            SELECT id, title, 'exam' as type, submit_time, score, status
            FROM exam 
            WHERE student_id = %s
        """
        exam_results = sql_output(exam_sql, (student_id,))
        if exam_results:
            for row in exam_results:
                submissions.append({
                    'id': row[0],
                    'fileName': row[1],
                    'type': row[2],
                    'submitTime': row[3].strftime('%Y-%m-%d %H:%M:%S'),
                    'score': float(row[4]) if row[4] is not None else None,
                    'status': row[5]
                })
        
        # 按提交时间排序
        submissions.sort(key=lambda x: x['submitTime'], reverse=True)
        
        return jsonify(submissions)
    except Exception as e:
        print(f"获取提交历史错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取提交历史失败'})

# API：获取提交详情
@app.route('/api/submission/<int:submission_id>')
def get_submission_detail(submission_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '用户未登录'}), 401
        
    try:
        student_id = session['user_id']
        submission = None
        
        # 先在作业表中查找
        homework_sql = """
            SELECT id, file_name, submit_time, score, feedback, content_summary, 'homework' as type
            FROM homework 
            WHERE id = %s AND student_id = %s
        """
        result = sql_output(homework_sql, (submission_id, student_id))
        
        if result:
            row = result[0]
            submission = {
                'id': row[0],
                'fileName': row[1],
                'submitTime': row[2].strftime('%Y-%m-%d %H:%M:%S'),
                'score': float(row[3]) if row[3] is not None else None,
                'feedback': row[4],
                'contentSummary': row[5],
                'type': row[6]
            }
        else:
            # 在测试表中查找
            test_sql = """
                SELECT id, title, submit_time, score, feedback, content, 'test' as type
                FROM test 
                WHERE id = %s AND student_id = %s
            """
            result = sql_output(test_sql, (submission_id, student_id))
            
            if result:
                row = result[0]
                submission = {
                    'id': row[0],
                    'fileName': row[1],
                    'submitTime': row[2].strftime('%Y-%m-%d %H:%M:%S'),
                    'score': float(row[3]) if row[3] is not None else None,
                    'feedback': row[4],
                    'contentSummary': row[5],
                    'type': row[6]
                }
            else:
                # 在考试表中查找
                exam_sql = """
                    SELECT id, title, submit_time, score, feedback, content, 'exam' as type
                    FROM exam 
                    WHERE id = %s AND student_id = %s
                """
                result = sql_output(exam_sql, (submission_id, student_id))
                
                if result:
                    row = result[0]
                    submission = {
                        'id': row[0],
                        'fileName': row[1],
                        'submitTime': row[2].strftime('%Y-%m-%d %H:%M:%S'),
                        'score': float(row[3]) if row[3] is not None else None,
                        'feedback': row[4],
                        'contentSummary': row[5],
                        'type': row[6]
                    }
        
        if not submission:
            return jsonify({'success': False, 'message': '提交记录不存在'})
        
        return jsonify(submission)
    except Exception as e:
        print(f"获取提交详情错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取提交详情失败'})

# API：获取分析数据
@app.route('/api/user/analysis')
def get_user_analysis():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '用户未登录'}), 401
        
    try:
        student_id = session['user_id']
        
        # 获取成绩趋势（最近6个月）
        trends = []
        
        # 作业成绩趋势
        homework_trend_sql = """
            SELECT DATE_TRUNC('month', submit_time) as month, AVG(score) as avg_score
            FROM homework 
            WHERE student_id = %s AND submit_time >= NOW() - INTERVAL '6 months' AND score IS NOT NULL
            GROUP BY DATE_TRUNC('month', submit_time)
            ORDER BY month
        """
        homework_trends = sql_output(homework_trend_sql, (student_id,))
        
        # 测试成绩趋势
        test_trend_sql = """
            SELECT DATE_TRUNC('month', submit_time) as month, AVG(score) as avg_score
            FROM test 
            WHERE student_id = %s AND submit_time >= NOW() - INTERVAL '6 months' AND score IS NOT NULL
            GROUP BY DATE_TRUNC('month', submit_time)
            ORDER BY month
        """
        test_trends = sql_output(test_trend_sql, (student_id,))
        
        # 考试成绩趋势
        exam_trend_sql = """
            SELECT DATE_TRUNC('month', submit_time) as month, AVG(score) as avg_score
            FROM exam 
            WHERE student_id = %s AND submit_time >= NOW() - INTERVAL '6 months' AND score IS NOT NULL
            GROUP BY DATE_TRUNC('month', submit_time)
            ORDER BY month
        """
        exam_trends = sql_output(exam_trend_sql, (student_id,))
        
        # 合并所有趋势数据
        month_scores = {}
        
        if homework_trends:
            for row in homework_trends:
                month = row[0].strftime('%Y-%m')
                if month not in month_scores:
                    month_scores[month] = []
                month_scores[month].append(float(row[1]))
        
        if test_trends:
            for row in test_trends:
                month = row[0].strftime('%Y-%m')
                if month not in month_scores:
                    month_scores[month] = []
                month_scores[month].append(float(row[1]))
        
        if exam_trends:
            for row in exam_trends:
                month = row[0].strftime('%Y-%m')
                if month not in month_scores:
                    month_scores[month] = []
                month_scores[month].append(float(row[1]))
        
        # 计算每月平均分
        for month, scores in month_scores.items():
            avg_score = sum(scores) / len(scores)
            trends.append({
                'month': month,
                'avgScore': round(avg_score, 2)
            })
        
        trends.sort(key=lambda x: x['month'])
        
        # 获取提交类型分布
        distribution = {
            'homework': 0,
            'test': 0,
            'exam': 0
        }
        
        # 作业数量
        homework_count_sql = "SELECT COUNT(*) FROM homework WHERE student_id = %s"
        homework_count = sql_output(homework_count_sql, (student_id,))
        if homework_count:
            distribution['homework'] = homework_count[0][0]
        
        # 测试数量
        test_count_sql = "SELECT COUNT(*) FROM test WHERE student_id = %s"
        test_count = sql_output(test_count_sql, (student_id,))
        if test_count:
            distribution['test'] = test_count[0][0]
        
        # 考试数量
        exam_count_sql = "SELECT COUNT(*) FROM exam WHERE student_id = %s"
        exam_count = sql_output(exam_count_sql, (student_id,))
        if exam_count:
            distribution['exam'] = exam_count[0][0]
        
        return jsonify({
            'trends': trends,
            'distribution': distribution
        })
    except Exception as e:
        print(f"获取分析数据错误: {str(e)}")
        return jsonify({'success': False, 'message': '获取分析数据失败'})

if __name__ == '__main__':
    app.run(debug=True)