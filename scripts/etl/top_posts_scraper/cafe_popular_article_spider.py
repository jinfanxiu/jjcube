import glob
import html
import json
import logging
import os
import pathlib
import re
from json import JSONDecodeError
from scrapy.utils.response import open_in_browser
from scrapy.http import HtmlResponse
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from urllib.parse import urlparse, urljoin
import scrapy
from datetime import datetime, timedelta
import sys

sys.path.append((pathlib.Path(__file__).parent.parent / 'common').as_posix())
from article_spider import ArticleSpider

"""
이 파일은 통합검색의 옵션 메뉴를 활용하여 특정 날짜를 지정하면 그 날 부터 1일씩 추가하면서
검색 결과를 가져오는 원리이다. 

사용순서
1. naver_cafe_spider.py
2. remove_bad_line.py -> 길거나 광고 게시글은 삭제
3. print_java_command.py -> java를 활용하여 형태소 분석
4. merge_pos_files.py -> posed 결과물을 합치기 

"""


class CafePopularArticleSpider(ArticleSpider):
    name = "spider"

    def __init__(self, cafe_id):
        super().__init__()
        self.cafe_id = cafe_id
        self.cafe_nick = None
        self.popular_article_url = f"https://apis.naver.com/cafe-web/cafe2/WeeklyPopularArticleListV3.json?cafeId={self.cafe_id}&mobileWeb=true&adUnit=PC_CAFE_BOARD&ad=false"
        self.w = None

    def start_requests(self):
        yield scrapy.Request(url=self.popular_article_url, callback=self.parse)

    def parse(self, response, **kwargs):
        json_data = json.loads(response.xpath('/html/body/pre/text()').get())

        self.cafe_nick = json_data['message']['result']['cafeUrl']

        file_path = (pathlib.Path(__file__).parent / 'data' / f'cafe_{self.cafe_nick}_unprocessed.tsv').as_posix()
        self.w = open(file_path, 'w', encoding="utf-8")
        response.meta['w'] = self.w

        for article_info in json_data['message']['result']['articleList']:
            subject = article_info['subject']
            article_id = article_info['articleId']

            print(f"subject: {subject} | https://cafe.naver.com/ca-fe/cafes/{self.cafe_id}/articles/{article_id}?fromPopular=true")
            meta = dict(cafe_id=self.cafe_id, article_id=article_id, w=response.meta['w'])
            url = self.popular_article_api_base_url.format(self.cafe_id, article_id)
            yield scrapy.Request(url=url, callback=self.parse_article, meta=meta)

    def parse_cafe_article(self, response, **kwargs):
        url_obj = urlparse(response.url)
        if url_obj.hostname == 'm.cafe.naver.com':
            cafe_id = url_obj.path.split('/')[1]
            article_id = url_obj.path.split('/')[2]
            url = f"https://cafe.naver.com/{cafe_id}/{article_id}?{url_obj.query}"
            yield scrapy.Request(url=url, callback=self.parse_cafe_article, meta={'article_id': article_id, 'w': response.meta['w']}, dont_filter=True)
            return
        try:
            cafe_id_num = re.search('g_sClubId = \"\d+\"', response.text).group().split('"')[1]
            url = self.api_base_url.format(cafe_id_num, response.meta['article_id'])
            art_key = urlparse(response.url).query
            added_query_url = f"{url}?{urlparse(response.url).query}"
            meta = dict(cafe_id=cafe_id_num, article_id=response.meta['article_id'], w=response.meta['w'], art_key=art_key)
            yield scrapy.Request(url=added_query_url, callback=self.parse_article, meta=meta)
        except Exception as e:
            print(e)

    def get_date_string_pair(self, days):
        date = []
        t = datetime(2024, 1, 1)
        while (datetime.now() > t):
            if days == 0:
                t1 = t
                t2 = t
                t += timedelta(days=1)
                date.append((t1.strftime("%Y%m%d"), t2.strftime("%Y%m%d")))
            else:
                t1 = t
                t += timedelta(days=days)
                t2 = t
                date.append((t1.strftime("%Y%m%d"), t2.strftime("%Y%m%d")))
        return date

    def close(self, reason):
        self.w.close()


def run_spider(cafe_id):
    process = CrawlerProcess()
    process.crawl(CafePopularArticleSpider, cafe_id)
    process.start()


if __name__ == '__main__':
    cafe_id = "15101779"
    run_spider(cafe_id)
