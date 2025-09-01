from peewee import *
from playhouse.db_url import connect

# ⚠️ 아래 DB_URL 값을 본인의 Supabase 데이터베이스 연결 주소(URI)로 변경하세요.
# 예: 'postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres'
DB_URL = 'postgresql://postgres.ejksqilplxozpibhncud:Nvq3osw54nICb6dF@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'

db = connect(DB_URL)

class Article(Model):
    # Supabase 'articles' 테이블 스키마에 맞춘 모델 정의
    # id, created_at은 자동 생성되므로 여기서는 정의하지 않습니다.
    url = CharField(unique=True, max_length=512)
    title = TextField()
    content = TextField()
    comments = TextField()

    class Meta:
        database = db
        table_name = 'articles' # Supabase에 생성한 테이블 이름과 일치시킵니다.