import psycopg2
from openai import OpenAI
from DB import get_db_connection
from datetime import datetime
import json

def sql_input(sql, params=None):
    """
    执行插入、更新或删除操作
    返回：影响的行数或新插入记录的ID
    """
    conn = get_db_connection()
    if not conn:
        return None

    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        conn.commit()
        
        # 如果SQL语句包含RETURNING子句，返回结果
        if sql.upper().find('RETURNING') != -1:
            result = cursor.fetchone()
            return result[0] if result else None
        
        return cursor.rowcount
    except Exception as e:
        print(f'SQL执行错误: {str(e)}')
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def sql_output(sql, params=None):
    """
    执行查询操作
    返回：查询结果列表
    """
    conn = get_db_connection()
    if not conn:
        return None

    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        return cursor.fetchall()
    except Exception as e:
        print(f'SQL查询错误: {str(e)}')
        return None
    finally:
        cursor.close()
        conn.close()

def chat(message):
    """
    与AI模型进行对话
    参数：
        message: 用户输入的消息
    返回：
        AI模型的回复（JSON格式的字符串）
    """
    try:
        client = OpenAI(api_key="sk-13b8f3244f3542f5b7b620dec6618cee", base_url="https://api.deepseek.com")

        # 构建系统提示词
        system_prompt = """
        你是一个专业的作业批改助手，负责：
        1. 评估学生作业的质量
        2. 提供详细的评分和反馈
        3. 给出具体的改进建议
        
        请按以下格式返回结果：
        {
            "score": 分数（0-100的浮点数）,
            "feedback": "总体评价",
            "suggestions": ["改进建议1", "改进建议2", ...]
        }
        """

        # 发送请求到AI模型
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            stream=False
        )

        # 获取AI回复
        ai_response = response.choices[0].message.content

        # 验证返回的是否为有效的JSON格式
        try:
            json.loads(ai_response)
            return ai_response
        except json.JSONDecodeError:
            # 如果不是JSON格式，将回复封装为JSON
            return json.dumps({
                "score": 0,
                "feedback": ai_response,
                "suggestions": ["AI返回格式异常，请重试"]
            })

    except Exception as e:
        print(f'AI对话错误: {str(e)}')
        return json.dumps({
            "score": 0,
            "feedback": "AI服务暂时不可用，请稍后重试",
            "suggestions": ["系统错误，请联系管理员"]
        })

def process_homework(content, student_id):
    """
    处理作业提交
    参数：
        content: 作业内容
        student_id: 学生ID
    返回：
        处理结果（字典）
    """
    try:
        # 调用AI批改
        correction_result = chat(content)
        result_dict = json.loads(correction_result)

        # 更新数据库中的作业记录
        sql = """
        UPDATE homework 
        SET score = %s, 
            feedback = %s, 
            status = 'completed' 
        WHERE student_id = %s 
        AND status = 'pending' 
        RETURNING id
        """
        
        homework_id = sql_input(
            sql, 
            (result_dict['score'], 
             result_dict['feedback'], 
             student_id)
        )

        if homework_id:
            return {
                "success": True,
                "homework_id": homework_id,
                "correction": result_dict
            }
        else:
            return {
                "success": False,
                "message": "作业更新失败"
            }

    except Exception as e:
        print(f'作业处理错误: {str(e)}')
        return {
            "success": False,
            "message": "作业处理过程中出错"
        }

if __name__ == "__main__":
    # 测试数据库连接
    conn = get_db_connection()
    if conn:
        conn.close()
        print("数据库连接测试成功")
    
    # 测试AI对话
    test_message = "这是一个测试消息"
    response = chat(test_message)
    print(f"AI回复: {response}")
    