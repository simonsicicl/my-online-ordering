import pymysql
import json

def lambda_handler(event, context):
    data = json.loads(event['body'])
    items = data.get('items', [])

    connection = pymysql.connect(
        host='your-rds-endpoint',
        user='admin',
        password='your-password',
        database='ordering',
        cursorclass=pymysql.cursors.DictCursor
    )

    try:
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO orders (items) VALUES (%s)", (json.dumps(items),))
            connection.commit()
            order_id = cursor.lastrowid
        return {
            'statusCode': 200,
            'body': json.dumps({'orderId': order_id})
        }
    finally:
        connection.close()
