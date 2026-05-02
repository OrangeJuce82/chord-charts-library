# chord-charts-library
A chord chart library 


## Database Models

If you want generate models from your SQLite, just run : 
```
python -m pwiz -e sqlite db/chord_charts.sqlite > ccl/db/models.py
```

## Scraping

To scrape data from irealb.com, run the spider with:
```
uv run scrapy crawl irealb
```

This will start the IRealB spider and collect chord chart data.

## TODO list

* Make a Database model only for specific chart
* Then later make a SQL View with chart from different patners
* Actualize Ireal Pro Chart with Datetime and last search, to add only new messages
* Remove duplicates, in CSV directly before insert : Sometimes data are stored url_encoded and not encoded
* Separate URL Directly in the CSV 