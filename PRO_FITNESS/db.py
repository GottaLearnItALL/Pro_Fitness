from mysql.connector import connect, Error
from dotenv import load_dotenv
import os


load_dotenv()

DB_CONFIG = {
    "host": 'localhost',
    "username": os.environ['MYSQL_USERNAME'],
    "password": os.environ['MYSQL_PASSWORD'],
    "database": "gym_application"
}


def get_connection():
    """ Get a connection """
    return connect(**DB_CONFIG)



def execute(query, params=None, fetch=False):
    """ Run an SQL Query 
    
    Args: 
        query: SQL String (use %s for parameters)
        params: tuple of values to safely inject
        fetch: True for SELECT querries that return rows
    
    Returns: 
        List of rows if fethc=True, else None
    """
    try:
        with get_connection() as connect:
            with connect.cursor(dictionary=True) as cursor:
                cursor.execute(query, params)
            
                if fetch:
                    return cursor.fetchall()
                
                connect.commit()
                print(f'Query OK - rows affected: {cursor.rowcount}')
                return cursor.lastrowid
    except Error as e:
        print(f"Database Error: {e}")
        raise
        


def init_schema():
    """ Run Schema.sql to initialize the database"""
    schema_path = os.path.join(os.path.dirname(__file__),"Schema.sql") # Fet the path of the current script and join it with schema.sql

    config_no_db = {k: v for k, v in DB_CONFIG.items() if k != 'database'}

    try:
        with connect(**config_no_db) as conn:
            with conn.cursor() as cursor:
                with open(schema_path, "r") as f:
                    
                    statements = f.read().split(';')
                    
                    for stmt in statements:
                        stmt = stmt.strip()
                        if stmt:
                            cursor.execute(stmt)
                    conn.commit
        print("Schema initialized Sucesfully.")
    except Error as e:
        print(f"Schema init error {e}")
        raise


if __name__ == '__main__':
    init_schema()









