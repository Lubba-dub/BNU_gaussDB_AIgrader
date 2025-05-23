import psycopg2

def get_db_connection():
    try:
        conn = psycopg2.connect(
            database="finance01",
            user="python0l_user31",
            password="python01_user31@123",
            host="192.168.0.207",
            port=8000
        )
        print('Database connection successful!')
        return conn
    except Exception as e:
        print(f'Database connection failed: {str(e)}')
        return None

def init_database():
    conn = get_db_connection()
    if not conn:
        return False

    cursor = conn.cursor()
    try:
        # 创建班级表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS s_class (
            class_id SERIAL PRIMARY KEY,
            major VARCHAR(50) NOT NULL,
            teacher VARCHAR(50) NOT NULL
        );
        """)

        # 创建学生表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS student (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(100) NOT NULL,
            name VARCHAR(50) NOT NULL,
            class VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 创建作业表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS homework (
            id SERIAL PRIMARY KEY,
            student_id INT REFERENCES student(id),
            file_name VARCHAR(255) NOT NULL,
            submit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            score DECIMAL(5,2),
            feedback TEXT,
            status VARCHAR(20) DEFAULT 'pending'
        );
        """)

        # 创建测试表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS test (
            id SERIAL PRIMARY KEY,
            student_id INT REFERENCES student(id),
            title VARCHAR(100) NOT NULL,
            content TEXT,
            submit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            score DECIMAL(5,2),
            feedback TEXT,
            status VARCHAR(20) DEFAULT 'pending'
        );
        """)

        # 创建考试表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS exam (
            id SERIAL PRIMARY KEY,
            student_id INT REFERENCES student(id),
            title VARCHAR(100) NOT NULL,
            content TEXT,
            submit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            score DECIMAL(5,2),
            feedback TEXT,
            status VARCHAR(20) DEFAULT 'pending'
        );
        """)

        conn.commit()
        print('Database tables created successfully!')
        return True

    except Exception as e:
        print(f'Error creating tables: {str(e)}')
        conn.rollback()
        return False

    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    init_database()