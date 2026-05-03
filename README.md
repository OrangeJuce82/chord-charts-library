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

## Monitoring file sizes

To check the size of output files, run:
```
watch -n 2 '
a=$(wc -l < irealb2.csv); 
b=$(wc -l < irealb_new.csv); 
sa=$(du -h irealb2.csv | cut -f1); 
sb=$(du -h irealb_new.csv | cut -f1); 

echo "irealb2.csv: $a lignes | $sa"; 
echo "irealb_new.csv: $b lignes | $sb"; 
echo "Différence lignes: $((b-a))"
'