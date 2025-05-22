import unittest
import json
from DB import get_db_connection, init_database
from main import sql_input, sql_output, chat, process_homework
from datetime import datetime

class TestDatabaseOperations(unittest.TestCase):
    def setUp(self):
        """测试前初始化数据库"""
        self.assertTrue(init_database())
        self.conn = get_db_connection()
        self.cursor = self.conn.cursor()

    def tearDown(self):
        """测试后清理数据库"""
        if hasattr(self, 'cursor') and self.cursor:
            self.cursor.close()
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()

    def test_database_connection(self):
        """测试数据库连接"""
        self.assertIsNotNone(self.conn)
        self.assertTrue(self.conn.closed == 0)

    def test_sql_input(self):
        """测试SQL插入操作"""
        # 插入测试班级
        sql = "INSERT INTO s_class (major, teacher) VALUES (%s, %s) RETURNING class_id"
        class_id = sql_input(sql, ("计算机科学", "张老师"))
        self.assertIsNotNone(class_id)

        # 插入测试学生
        sql = "INSERT INTO student (username, password, email, class_id) VALUES (%s, %s, %s, %s) RETURNING id"
        student_id = sql_input(sql, ("test_user", "test_pass", "test@example.com", class_id))
        self.assertIsNotNone(student_id)

    def test_sql_output(self):
        """测试SQL查询操作"""
        # 查询所有班级
        sql = "SELECT * FROM s_class"
        result = sql_output(sql)
        self.assertIsNotNone(result)
        self.assertIsInstance(result, list)

class TestAIOperations(unittest.TestCase):
    def setUp(self):
        """测试前准备"""
        self.test_message = """
        这是一篇测试作业。
        主题：Python编程基础
        内容：
        1. 变量和数据类型
        2. 控制流程
        3. 函数定义
        结论：通过编程实践加深对Python的理解。
        """

    def test_chat_response_format(self):
        """测试AI回复格式"""
        response = chat(self.test_message)
        self.assertIsNotNone(response)
        
        # 验证返回的是有效的JSON字符串
        try:
            result = json.loads(response)
            self.assertIn('score', result)
            self.assertIn('feedback', result)
            self.assertIn('suggestions', result)
            
            # 验证分数范围
            self.assertGreaterEqual(result['score'], 0)
            self.assertLessEqual(result['score'], 100)
            
            # 验证反馈不为空
            self.assertNotEqual(result['feedback'].strip(), '')
            
            # 验证建议列表不为空
            self.assertGreater(len(result['suggestions']), 0)
        except json.JSONDecodeError:
            self.fail("AI返回的不是有效的JSON格式")

    def test_process_homework(self):
        """测试作业处理流程"""
        # 先创建测试数据
        sql = "INSERT INTO s_class (major, teacher) VALUES (%s, %s) RETURNING class_id"
        class_id = sql_input(sql, ("测试专业", "测试老师"))
        
        sql = "INSERT INTO student (username, password, email, class_id) VALUES (%s, %s, %s, %s) RETURNING id"
        student_id = sql_input(sql, ("test_student", "test_pass", "test@test.com", class_id))
        
        sql = "INSERT INTO homework (student_id, file_name, status) VALUES (%s, %s, %s) RETURNING id"
        homework_id = sql_input(sql, (student_id, "test_homework.doc", "pending"))
        
        # 测试作业处理
        result = process_homework(self.test_message, student_id)
        self.assertTrue(result['success'])
        self.assertIn('correction', result)

def optimize_ai_prompt():
    """优化AI提示词"""
    return """
    你是一个专业的教育评估专家和作业批改助手。你的主要职责是：

    1. 作业评估：
       - 根据学术标准评估作业质量
       - 考虑内容的准确性、完整性和创新性
       - 评估论述的逻辑性和连贯性
       - 检查格式规范和引用规范

    2. 评分标准：
       - 90-100分：优秀，内容全面、见解深刻、格式规范
       - 80-89分：良好，内容完整、理解准确、小有瑕疵
       - 70-79分：中等，基本要求达标、有待提高
       - 60-69分：及格，存在明显不足、需要改进
       - 60分以下：不及格，严重问题需要重做

    3. 反馈要求：
       - 提供具体、可操作的改进建议
       - 指出亮点和不足
       - 给出提高建议
       - 鼓励学生进步

    请按以下JSON格式返回评估结果：
    {
        "score": 分数（0-100的浮点数）,
        "feedback": "详细的评价反馈",
        "suggestions": [
            "具体的改进建议1",
            "具体的改进建议2",
            "具体的改进建议3"
        ],
        "highlights": ["亮点1", "亮点2"],
        "improvements": ["需要改进的地方1", "需要改进的地方2"]
    }
    """

def add_business_features():
    """添加更多业务功能"""
    # 这里可以实现更多的业务功能，比如：
    # 1. 批量作业处理
    # 2. 作业查重
    # 3. 成绩统计分析
    # 4. 学习进度跟踪
    # 5. 个性化建议生成
    pass

if __name__ == '__main__':
    # 运行所有测试
    unittest.main()