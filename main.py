import psycopg2
from openai import OpenAI

conn=psycopg2.connect(database="finance01",user="python01_user48",password="python01_user48@123",host="110.41.115.206",port=8000)  # 使用connect()
print('connect successful!')
cursor=conn.cursor() #使用连接对象的cursor()获取游标对象

def sql_input():
    sql="select * from weapon;"
    cursor.execute(sql)
    n = cursor.rowcount
    result=cursor.fetchall()
    return n, result

def sql_output(n, responses):
    sql="insert into weapon(weapon_id,weapon_type,num_cn,num_usa) value "
    for response in responses:
        sql = sql + f"('{response}'),"
    sql=sql[:-1]
    cursor.execute(sql)

def chat(message):
    
    client = OpenAI(api_key="<DeepSeek API Key>", base_url="https://api.deepseek.com")

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": message},
        ],
        stream=False
    )

    return response.choices[0].message.content

def send_message(messages):
    

if __name__ == "__main__":
    