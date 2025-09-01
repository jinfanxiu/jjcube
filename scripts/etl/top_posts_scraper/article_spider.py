import html
import json
import logging
import re
import time
from datetime import datetime
from urllib.parse import urlparse
import scrapy
import undetected_chromedriver as uc  # 변경된 부분
from scrapy import signals
from scrapy.crawler import CrawlerProcess
from scrapy.http import HtmlResponse
from scrapy.utils.project import get_project_settings
from scrapy.utils.python import to_bytes


class ArticleSpider(scrapy.Spider):
    """
    start_requests 메소드 안에서
    반드시 아래와 같은 형식으로 전달하게 되면 자동으로 파일에 기록이 된다.
    url = self.api_base_url.format(cafe_id, article_id)
    meta = dict(cafe_id=cafe_id, article_id=article_id, w=w)
    yield scrapy.Request(url=url, callback=self.parse_article, meta=meta)
    """
    name = "article_spider"
    title_col = 6
    content_col = 7
    comment_col = 8
    custom_settings = {
        'DOWNLOADER_MIDDLEWARES': {
            'article_spider.ArticleByIdSpiderDownloaderMiddleware': 100,  # 경로 수정
            'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
            'scrapy.downloadermiddlewares.retry.RetryMiddleware': None,
            'scrapy.downloadermiddlewares.httpauth.HttpAuthMiddleware': None,
        },
        'ROBOTSTXT_OBEY': False,
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0.5,
    }

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.popular_article_api_base_url = 'https://article.cafe.naver.com/gw/v3/cafes/{}/articles/{}?query=&fromPopular=true&useCafeId=true&requestFrom=A'
        self.popular_comment_api_base_url = 'https://article.cafe.naver.com/gw/v4/cafes/{}/articles/{}/comments/pages/{}?requestFrom=A&orderBy=asc&fromPopular=true'
        self.api_base_url = 'https://apis.naver.com/cafe-web/cafe-articleapi/v3/cafes/{}/articles/{}'
        self.comment_base_url = 'https://apis.naver.com/cafe-web/cafe-articleapi/v2/cafes/{}/articles/{}/comments/pages/{}?requestFrom=A&orderBy=asc'

    def start_requests(self):
        w = open('text.tsv', 'w', encoding='utf-8')
        article_id = '2590209'
        cafe_id = '23611966'
        url = self.api_base_url.format(cafe_id, article_id)
        meta = dict(cafe_id=cafe_id, article_id=article_id, w=w)
        yield scrapy.Request(url=url, callback=self.parse_article, meta=meta)

    def parse_article(self, response):
        json_str = response.text[response.text.find("{"): response.text.rfind("}") + 1]
        j = json.loads(json_str)

        article_id = str(j['result']['articleId'])
        board_id = str(j["result"]["article"]["menu"]["id"])
        user_id = str(j['result']['article']['writer']['nick'])
        cafe_name = str(j['result']['cafe']['pcCafeName'])
        board_name = str(j["result"]["article"]["menu"]["name"].strip())
        read_count = str(j['result']['article']['readCount'])
        subject = str(re.sub("\n|\r|\t", ' ', j["result"]["article"]["subject"]).strip())
        content = self.parse_content(' '.join(j["result"]["article"]["contentHtml"].split()).strip())
        date = datetime.utcfromtimestamp(int(str(j["result"]["article"]["writeDate"])[:-3])).strftime("%Y-%m-%d")

        cafe_id = j['result']['cafe']['url']
        article_url = self.create_article_url(cafe_id, article_id, response)

        response.meta['d'] = dict(
            article_id=article_id,
            board_id=board_id,
            cafe_name=cafe_name,
            board_name=board_name,
            user_id=user_id,
            read_count=read_count,
            subject=subject,
            content=content,
            comments='',
            date=date,
            article_url=article_url,
        )

        response.meta['page'] = 1
        cafe_id = response.meta['cafe_id']
        url = self.create_comment_url(cafe_id, article_id, response)

        response.meta['comments'] = list()
        response.meta['comments_set'] = set()

        yield scrapy.Request(url=url, callback=self.parse_comments, meta=response.meta)

    def parse_comments(self, response):
        data_str = response.text
        json_str = data_str[data_str.find("{"): data_str.rfind("}") + 1]
        j = json.loads(json_str)

        items = j['result']['comments']['items']
        if items:
            for comments in j['result']['comments']['items']:
                if comments['id'] not in response.meta['comments_set']:
                    comment = re.sub("\n|\r|\t", chr(12), comments['content'].strip())
                    response.meta['comments'].append(comment)
                    response.meta['comments_set'].add(comments['id'])
            response.meta['page'] += 1

            cafe_id = response.meta['cafe_id']
            article_id = response.meta['d']['article_id']
            url = self.create_comment_url(cafe_id, article_id, response)

            yield scrapy.Request(url=url, callback=self.parse_comments, meta=response.meta)
        else:
            response.meta['d']['comments'] = chr(28).join(response.meta['comments'])
            line = '\t'.join(list(response.meta['d'].values())) + "\n"
            response.meta['w'].write(line)
            # print(line)

    def parse_content(self, string):
        string = html.unescape(html.unescape(string))
        string = re.sub('\[\[\[CONTENT-ELEMENT-\d+\]\]\]', '', string)
        string = re.sub("<.+?>", "", string, 0, re.I | re.S)
        string = re.sub('\r|\n|\t|\\\\n', chr(12), string)
        string = ' '.join(string.split())

        parsing_target_list = ["\u200b", "\ufeff"]  # , '\\\+#+']
        for target_str in parsing_target_list:
            string = re.sub(target_str, '', string)

        return string

    def create_comment_url(self, cafe_id, article_id, response):
        if urlparse(response.url).hostname.startswith('article'):
            return self.popular_comment_api_base_url.format(cafe_id, article_id, response.meta['page'])
        else:
            if 'art_key' in response.meta:
                return self.comment_base_url.format(cafe_id, article_id, response.meta['page']) + f'&{response.meta["art_key"]}'
            else:
                return self.comment_base_url.format(cafe_id, article_id, response.meta['page'])

    def create_article_url(self, cafe_id, article_id, response):
        if 'art_key' in response.meta:
            return f"https://cafe.naver.com/{cafe_id}/{article_id}" + f"?{response.meta['art_key']}"
        else:
            return f"https://cafe.naver.com/{cafe_id}/{article_id}"


class ArticleByIdSpiderDownloaderMiddleware:
    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        crawler.signals.connect(s.spider_closed, signal=signals.spider_closed)  # spider_closed 연결 추가
        return s

    def process_request(self, request, spider):
        # API URL이 아닌 경우에만 Selenium을 사용하도록 조건 추가
        if not request.url.startswith('https://apis.naver.com'):
            return None  # Scrapy의 기본 Downloader가 처리하도록 함

        time.sleep(1)
        self.driver.get(request.url)
        body = to_bytes(text=self.driver.page_source)
        return HtmlResponse(url=request.url, body=body, encoding='utf-8', request=request)

    def process_response(self, request, response, spider):
        return response

    def process_exception(self, request, exception, spider):
        pass

    def spider_opened(self, spider):
        logging.info("Spider opened, initializing undetected_chromedriver")
        options = uc.ChromeOptions()
        self.driver = uc.Chrome(options=options)

        self.driver.get('https://nid.naver.com/nidlogin.login')
        logging.info("Please log in to Naver within 20 seconds...")
        time.sleep(20)
        logging.info("Login time finished. Starting crawl.")

    def spider_closed(self, spider):
        logging.info("Spider closed, quitting driver.")
        self.driver.quit()  # driver.close() 대신 quit() 사용 권장


def run_spider():
    process = CrawlerProcess(get_project_settings())
    process.crawl(ArticleSpider)
    process.start()


if __name__ == '__main__':
    run_spider()
