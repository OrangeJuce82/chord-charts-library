import scrapy


class IRealBSpider(scrapy.Spider):
    name = "irealb"
    base_url = "https://forums.irealpro.com"

    def start_requests(self):
        yield scrapy.Request(url=self.base_url, callback=self.parse)

    @staticmethod
    def get_links(response, start_with="/"):
        return list(
            set(
                a.attrib["href"]
                for a in response.xpath(f"//a[starts-with(@href,'{start_with}')]")
            )
        )

    def parse(self, response):
        rel_links = IRealBSpider.get_links(response, "/forums/")
        for rel_link in rel_links:
            yield scrapy.Request(f"{self.base_url}{rel_link}", self.parse_forum)

    def parse_forum(self, response):
        print("parse_forum", response.url)
        rel_links = IRealBSpider.get_links(response, "/threads/")
        for rel_link in rel_links:
            yield scrapy.Request(f"{self.base_url}{rel_link}", self.parse_thread)

        next_link = response.css("a.pageNav-jump--next")
        if "href" in next_link.attrib:
            next_link = next_link.attrib["href"]
            yield scrapy.Request(f"{self.base_url}{next_link}", self.parse_forum)

    def parse_thread(self, response):
        print("parse_thread", response.url)
        charts = [
            a.attrib["href"] for a in response.xpath("//a[starts-with(@href,'irealb')]")
        ]
        for chart in charts:
            chart = chart.replace("\n", "").replace('"', "")
            yield {"chart": chart}

        next_link = response.css("a.pageNav-jump--next")
        if "href" in next_link.attrib:
            next_link = next_link.attrib["href"]
            yield scrapy.Request(f"{self.base_url}{next_link}", self.parse_thread)
