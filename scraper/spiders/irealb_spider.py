import scrapy


class IRealBSpider(scrapy.Spider):
    name = 'irealb'
    base_url = 'https://irealb.com/forums/'

    def start_requests(self):
        yield scrapy.Request(url=self.base_url, callback=self.parse)

    def parse(self, response):
        forums = [a.attrib['href'] for a in response.css('#forums .forumtitle a')]
        for forum in forums:
            yield scrapy.Request(f'{self.base_url}{forum}', self.parse_forum)

    def next(self, response):
        return list(set([a.attrib['href'] for a in response.css('.prev_next a[rel=next]')]))

    def parse_forum(self, response):
        print("parse_forum", response.url)
        threads = [a.attrib['href'] for a in response.css('#threadlist .threadtitle a')]
        for thread in threads:
            yield scrapy.Request(f'{self.base_url}{thread}', self.parse_thread)

        for forum in self.next(response):
            yield scrapy.Request(f'{self.base_url}{forum}', self.parse_forum)

    def parse_thread(self, response):
        charts = [a.attrib['href'] for a in response.xpath("//a[starts-with(@href,'irealb')]")]
        for chart in charts:
            chart = chart.replace('\n', '').replace('"', '')
            yield {"chart": chart}

        for thread in self.next(response):
            yield scrapy.Request(f'{self.base_url}{thread}', self.parse_thread)
