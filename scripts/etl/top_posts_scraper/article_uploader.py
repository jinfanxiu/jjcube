import os
from database_setup import db, Article, CertificateReview

MODEL_MAP = {
    'articles': Article,
    'certificate_reviews': CertificateReview,
}


def upload_file_to_table(file_path: str, table_name: str):
    if not file_path or not table_name:
        print("❌ 오류: 'file_to_upload'와 'target_table' 변수 값을 설정해야 합니다.")
        return

    if not os.path.exists(file_path):
        print(f"❌ 오류: 파일 경로를 찾을 수 없습니다 -> '{file_path}'")
        return

    TargetModel = MODEL_MAP.get(table_name)
    if not TargetModel:
        print(f"❌ 오류: 지원되지 않는 테이블명입니다 -> '{table_name}'. 'articles' 또는 'certificate_reviews'를 사용하세요.")
        return

    try:
        db.connect()
        db.create_tables([TargetModel], safe=True)
        print(f"✅ 데이터베이스 연결 및 '{table_name}' 테이블 확인 완료.")
    except Exception as e:
        print(f"❌ 데이터베이스 연결에 실패했습니다: {e}")
        return

    file_name = os.path.basename(file_path)
    print(f"\n🔄 '{file_name}' 파일 처리 시작... (대상 테이블: {table_name})")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            processed_lines = 0
            for i, line in enumerate(f, 1):
                cols = line.strip().split('\t')
                if len(cols) < 11:
                    print(f"  - 경고: {i}번째 라인에 컬럼이 부족하여 건너뜁니다.")
                    continue

                url = cols[10].strip()
                title = cols[6]
                content = cols[7]
                comments = '\n댓글: ' + '\n댓글: '.join(cols[8].split(chr(28)))

                TargetModel.insert(
                    url=url,
                    title=title,
                    content=content,
                    comments=comments
                ).on_conflict(
                    conflict_target=(TargetModel.url,),
                    action='ignore'
                ).execute()
                processed_lines += 1

        print(f"✨ '{file_name}' 파일 처리 완료. ({processed_lines} 라인 -> '{table_name}' 테이블)")

    except Exception as e:
        print(f"❌ '{file_name}' 파일 처리 중 오류가 발생했습니다: {e}")
    finally:
        db.close()
        print("\n🎉 작업 완료! 데이터베이스 연결을 종료합니다.")


if __name__ == '__main__':
    # ▼▼▼ 실행 전, 업로드할 파일 경로와 테이블명을 여기에 직접 입력하세요. ▼▼▼

    # 예시 1: 자격증 후기 업로드 시
    file_to_upload = "/Users/jinfanxiu/jjcube/scripts/etl/top_posts_scraper/data/cafe_피부자격증합격후기_unprocessed.tsv"
    target_table = "certificate_reviews"

    # 예시 2: 뷰티 게시글 업로드 시 (아래 두 줄의 주석을 해제하고 위 두 줄을 주석 처리)
    # file_to_upload = "scripts/etl/data/cafe_뷰티주제_unprocessed.tsv"
    # target_table = "articles"

    # ▲▲▲ 수정 후 파일을 저장하고 스크립트를 실행하세요. ▲▲▲

    upload_file_to_table(file_to_upload, target_table)