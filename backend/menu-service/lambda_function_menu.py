import pymysql
import json

def lambda_handler(event, context):
    connection = pymysql.connect(
        host='your-rds-endpoint',
        user='admin',
        password='your-password',
        database='ordering',
        cursorclass=pymysql.cursors.DictCursor
    )

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name, price FROM menu")
            result = cursor.fetchall()
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    finally:
        connection.close()
