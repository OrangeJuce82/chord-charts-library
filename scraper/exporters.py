from scrapy.exporters import CsvItemExporter


class HeadlessCsvItemExporter(CsvItemExporter):
    """CSV Exporter without headers"""

    def __init__(self, *args, **kwargs):
        kwargs['include_headers_line'] = False
        super(HeadlessCsvItemExporter, self).__init__(*args, **kwargs)
