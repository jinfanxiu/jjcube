import os
import glob
from database_setup import db, Article


def upload_articles_from_tsv():
    """
    'data' 폴더 내의 모든 .tsv 파일을 읽어 데이터베이스에 업로드합니다.
    URL이 중복될 경우 건너뜁니다.
    """
    try:
        db.connect()
        print("✅ 데이터베이스 연결 성공!")
    except Exception as e:
        print(f"❌ 데이터베이스 연결에 실패했습니다: {e}")
        return

    # 현재 스크립트 파일이 위치한 디렉토리를 기준으로 'data' 폴더 경로를 설정합니다.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_folder_path = os.path.join(script_dir, 'data', '*.tsv')
    tsv_files = glob.glob(data_folder_path)

    if not tsv_files:
        print(f"⚠️ '{os.path.join(script_dir, 'data')}' 폴더에서 .tsv 파일을 찾을 수 없습니다.")
        db.close()
        return

    print(f"🔍 총 {len(tsv_files)}개의 .tsv 파일을 찾았습니다.")

    for file_path in tsv_files:
        file_name = os.path.basename(file_path)
        print(f"\n🔄 '{file_name}' 파일 처리 시작...")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                processed_lines = 0
                for i, line in enumerate(f, 1):
                    # .tsv 파일의 각 컬럼을 분리합니다.
                    cols = line.strip().split('\t')
                    if len(cols) < 11:  # 최소한 11개 컬럼이 있는지 확인
                        print(f"  - 경고: {i}번째 라인에 컬럼이 부족하여 건너뜁니다.")
                        continue

                    # 새 테이블 스키마에 맞게 데이터를 추출합니다.
                    url = cols[10].strip()  # 전체 URL을 사용합니다.
                    title = cols[6]
                    content = cols[7]
                    comments = '\n댓글: ' + '\n댓글: '.join(cols[8].split(chr(28)))

                    # Peewee를 사용하여 데이터를 삽입합니다.
                    # 'url' 컬럼에 UNIQUE 제약조건이 있으므로, 중복된 URL은 무시됩니다.
                    Article.insert(
                        url=url,
                        title=title,
                        content=content,
                        comments=comments
                    ).on_conflict(
                        conflict_target=(Article.url,),
                        action='ignore'  # 중복 시 아무 작업도 하지 않음
                    ).execute()

                    processed_lines += 1

            print(f"✨ '{file_name}' 파일 처리 완료. (총 {processed_lines} 라인)")

        except Exception as e:
            print(f"❌ '{file_name}' 파일 처리 중 오류가 발생했습니다: {e}")
            break  # 오류 발생 시 다음 파일로 넘어가지 않고 중단

    db.close()
    print("\n🎉 모든 작업 완료! 데이터베이스 연결을 종료합니다.")


if __name__ == '__main__':
    upload_articles_from_tsv()