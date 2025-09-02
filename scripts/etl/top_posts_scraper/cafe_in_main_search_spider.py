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


class CafeSearchSpider(ArticleSpider):
    name = "cafe_search_spider"

    def __init__(self):
        super().__init__()
        # self.keywords = ['전광판', '간판','입간판','돌출간판','LED공고판','LED간판','줄조명','실내간판','LED배너','야외LED조명']
        # self.base_url = "https://s.search.naver.com/p/cafe/search.naver?where=articleg&ie=utf8&query={}&prdtype=0&t=0&st=rel&srchby=text&dup_remove=1&cafe_url=&without_cafe_url=&sm=tab_opt&nso=so:r,p:from{}to{},a:all&nso_open=0&rev=44&abuse=0&ac=0&aq=0&converted=0&is_dst=0&nlu_query=%7B%22r_category%22%3A%2232%22%7D&nqx_context=&nx_and_query=&nx_search_hlquery=&nx_search_query=&nx_sub_query=&people_sql=0&spq=0&x_tab_article=&is_person=0&start={}&display=10&prmore=1"
        # self.base_url = "https://s.search.naver.com/p/cafe/48/search.naver?ac=1&aq=0&cafe_where=&date_from={}&date_option=8&date_to={}&display=30&m=8&nlu_query=%7B%22r_category%22%3A%2219+29%22%7D&nx_and_query=&nx_search_query=&nx_sub_query=&prdtype=0&prmore=1&qdt=1&query={}&qvt=1&spq=0&ssc=tab.m_cafe.all&st=rel&stnm=date&_=1725436901897&start={}"
        # self.base_url = "https://s.search.naver.com/p/cafe/48/search.naver?abt=&ac=1&aq=0&cafe_where=&date_from={}&date_option=8&date_to={}&display=30&m=0&nlu_query=&nx_and_query=&nx_search_query=&nx_sub_query=&prdtype=0&prmore=1&qdt=1&query={}&qvt=1&spq=0&ssc=tab.cafe.all&st=rel&start={}&stnm=date"
        self.base_url = "https://s.search.naver.com/p/cafe/48/search.naver?abt=&ac=1&aq=0&cafe_where=articleg&date_from={}&date_option=8&date_to={}&display=30&m=0&nlu_query=&nx_and_query=&nx_search_query=&nx_sub_query=&prdtype=0&prmore=1&qdt=1&query={}&qvt=1&spq=0&ssc=tab.cafe.all&st=rel&start={}&stnm=date"
        self.api_base_url = 'https://apis.naver.com/cafe-web/cafe-articleapi/v3/cafes/{}/articles/{}'
        self.cnt = ""

        # settings
        self.keywords = ['피부자격증합격후기']

    def start_requests(self):
        for keyword in self.keywords:
            duplicate = set()
            file_path = (pathlib.Path(__file__).parent / 'data' / f'cafe_{keyword}_unprocessed.tsv').as_posix()
            w = open(file_path, 'w', encoding="utf-8")

            page = 1
            date_pair = self.get_date_string_pair(days=0)
            # date_pair = [('20201115', '20201116')]
            for f, t in date_pair:
                url = self.base_url.format(f, t, keyword, page)
                yield scrapy.Request(url=url, callback=self.parse, meta=dict(page=page, f=f, t=t, w=w, keyword=keyword, duplicate=duplicate))

    def parse(self, response, **kwargs):
        res = response.text
        r = res[res.find("{"): res.rfind("}") + 1]
        r = json.loads(r)
        print(f"date: {response.meta['f']}-{response.meta['t']} | page: {response.meta['page']}")

        html = HtmlResponse(url=response.url, body=r['collection'][0]['html'].strip(), encoding='utf-8')
        self.cnt = 0
        for a_tag in html.xpath('/html/body/li/div/div[2]/div[1]/a'):
            title = ' '.join(map(lambda x: x.strip(), a_tag.css('::text').extract()))
            link = a_tag.xpath("@href").extract_first()
            (cafe_id, article_id) = urlparse(link).path.strip('/').split('/')

            cafe_article_id = f"{cafe_id}-{article_id}"
            if cafe_article_id not in response.meta['duplicate']:
                response.meta['duplicate'].add(cafe_article_id)
                self.cnt += 1

                url_obj = urlparse(link)
                url = f"https://cafe.naver.com/{cafe_id}/{article_id}?{url_obj.query}"
                yield scrapy.Request(url=url, callback=self.parse_cafe_article, meta={'article_id': article_id, 'w': response.meta['w']})

        if self.cnt == 0 or response.meta['page'] > 31:
            return

        keyword = response.meta['keyword']
        page = response.meta['page'] + 30
        f = response.meta['f']
        t = response.meta['t']
        w = response.meta['w']
        url = self.base_url.format(f, t, keyword, page)
        yield scrapy.Request(url=url, callback=self.parse, meta=dict(page=page, f=f, t=t, w=w, keyword=keyword, duplicate=response.meta['duplicate']))

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
        t = datetime(2025,1, 1)
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


if __name__ == '__main__':
    s = get_project_settings()
    s['DOWNLOADER_MIDDLEWARES'] = {
        'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
        'scrapy.downloadermiddlewares.retry.RetryMiddleware': None,
        'scrapy.downloadermiddlewares.httpauth.HttpAuthMiddleware': None,
    }
    s['ROBOTSTXT_OBEY'] = False
    s['CONCURRENT_REQUESTS'] = 1
    s['DOWNLOAD_DELAY'] = 0.5
    process = CrawlerProcess(s)
    process.crawl(CafeSearchSpider)
    process.start()
