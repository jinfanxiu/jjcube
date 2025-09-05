import html
import json
import logging
import re
import time
from datetime import datetime, timedelta
from urllib.parse import urlparse
import scrapy
import undetected_chromedriver as uc  # 변경된 부분
from scrapy import signals
from scrapy.crawler import CrawlerProcess
from scrapy.http import HtmlResponse
from scrapy.utils.project import get_project_settings
from scrapy.utils.python import to_bytes
from scrapy.utils.response import open_in_browser


class BlogSpider(scrapy.Spider):
    name = "blog_spider"
    custom_settings = {
        'DOWNLOADER_MIDDLEWARES': {
            'blog_spider.ArticleByIdSpiderDownloaderMiddleware': 100,  # 경로 수정
            'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
            'scrapy.downloadermiddlewares.retry.RetryMiddleware': None,
            'scrapy.downloadermiddlewares.httpauth.HttpAuthMiddleware': None,
        },
        'ROBOTSTXT_OBEY': False,
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0.5,
    }

    def __init__(self,
                 keyword,
                 aform=(datetime.now() - timedelta(days=90)).strftime('%Y%m%d'),
                 to=datetime.now().strftime('%Y%m%d'),
                 days=3,
                 **kwargs):
        super().__init__(**kwargs)
        self.keyword = keyword
        self.formatted_keyword = self.keyword.replace(' ', '+')
        self.aform = datetime.strptime(aform, '%Y%m%d')
        self.to = datetime.strptime(to, '%Y%m%d')
        self.days = days
        self.search_base_url = "https://search.naver.com/search.naver?sm=tab_hty.top&ssc=tab.blog.all&query={keyword}&oquery={formatted_keyword}&tqi=j7EZVwqosesssFjuK10ssssstwG-348627&ackey=4szu7vop&nso=so%3Ar%2Cp%3Afrom{afrom}to{to}"
        self.post_base_url = "https://blog.naver.com/PostView.naver?blogId={blog_id}&logNo={log_no}&redirect=Dlog&widgetTypeCall=true&noTrackingCode=true&directAccess=false"

    def start_requests(self):
        w = open(f'data/blog_{self.keyword}.tsv', 'w', encoding='utf-8')
        start = self.aform
        end = self.aform + timedelta(days=self.days)
        url = self.search_base_url.format(keyword=self.keyword, formatted_keyword=self.formatted_keyword,
                                          afrom=start.strftime('%Y%m%d'), to=end.strftime('%Y%m%d'))
        meta = dict(end=end, w=w)
        yield scrapy.Request(url=url, callback=self.parse_post_url, meta=meta)

    def parse_post_url(self, response):
        post_urls = response.xpath('//*[@id="main_pack"]/section/div[1]/ul/li/div/div[2]/div[2]/a/@href').getall()
        for url in post_urls:
            response.meta['blog_id'] = urlparse(url).path.split('/')[1]
            response.meta['log_no'] = urlparse(url).path.split('/')[-1]
            post_url = self.post_base_url.format(blog_id=response.meta['blog_id'], log_no=response.meta['log_no'])
            yield scrapy.Request(url=post_url, callback=self.parse_content, meta=response.meta, priority=100)

        start = response.meta['end'] + timedelta(days=1)
        response.meta['end'] = start + timedelta(days=self.days)
        if response.meta['end'] > self.to:
            return
        url = self.search_base_url.format(keyword=self.keyword, formatted_keyword=self.formatted_keyword,
                                          afrom=start.strftime('%Y%m%d'), to=response.meta['end'].strftime('%Y%m%d'))
        yield scrapy.Request(url=url, callback=self.parse_post_url, meta=response.meta)

    def parse_content(self, response):
        # results = [text.strip() for text in response.xpath("//*/table[2]/tbody/tr/td[2]/div[1]/div//div[3]/div//text() | //*/table[2]/tbody/tr/td[2]/div[1]/div//div[3]/div//img/@data-lazy-src").getall() if text.strip()]
        # results = [text.strip() for text in response.xpath("//*/table[2]/tbody/tr/td[2]/div[1]/div//div/div//text() | //*/table[2]/tbody/tr/td[2]/div[1]/div//div//img/@data-lazy-src").getall() if text.strip()]
        results = [text.strip() for text in response.xpath( "//div[contains(@class, 'se-main-container')]//div//text()[not(ancestor::style or ancestor::script)] | //div[contains(@class, 'se-main-container')]//div//img/@data-lazy-src").getall() if text.strip()]
        if results:
            row = dict(
                article_id=response.meta['log_no'],
                board_id='',
                cafe_name='',
                board_name='',
                user_id=response.meta['blog_id'],
                read_count='',
                subject=response.xpath('//*/table[2]/tbody/tr/td[2]/div//div/p/span/text()').get(),
                content='{nl}'.join(results),
                comments='',
                date='',
                article_url=response.url,
            )

            # 금지할 단어 목록 (명사 원형)
            FORBIDDEN_WORDS = ['부동산', '임대', '사무실', '쇼핑몰']
            text_data = ' '.join([str(text) for text in results])  # "저기 새로 생긴 아파트는 얼마인가요?"

            if not any(word in text_data for word in FORBIDDEN_WORDS):
                line = '\t'.join(list(row.values())) + "\n"
                response.meta['w'].write(line)
            else:
                print(f"❌ 실패: 금지된 단어가 포함되어 있습니다.")
        else:
            print(f"error: {response.url}")


class ArticleByIdSpiderDownloaderMiddleware:
    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        crawler.signals.connect(s.spider_closed, signal=signals.spider_closed)  # spider_closed 연결 추가
        return s

    def process_request(self, request, spider):
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
        time.sleep(1)
        logging.info("Login time finished. Starting crawl.")

    def spider_closed(self, spider):
        logging.info("Spider closed, quitting driver.")
        self.driver.quit()  # driver.close() 대신 quit() 사용 권장


def run_spider(kwd):
    process = CrawlerProcess(get_project_settings())
    process.crawl(BlogSpider, kwd)
    process.start()


if __name__ == '__main__':
    kwd = '올리브영리뷰'
    run_spider(kwd)
