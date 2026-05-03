# chord-charts-library
A chord chart library

## Database Models
If you want to generate models from your SQLite, just run:
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
* Then later make a SQL View with chart from different partners
* Update Ireal Pro Chart with Datetime and last search, to add only new messages
* Remove duplicates in CSV directly before insert: Sometimes data are stored url_encoded and not encoded
* Separate URL directly in the CSV

## Post Processing

Clean, Sort then filter duplicate lines once crawling is finished

```
sed 's/"//g' data/irealb.csv > data/irealb_cleaned.csv
sort data/irealb_cleaned.csv | uniq > data/irealb_sorted.csv
```



To check the size of output files, run:
```[irealb_20260503_sorted.csv](data/irealb_20260503_sorted.csv)
watch -n 2 '
a=$(wc -l < data/irealb_20260503_sorted.csv); 
b=$(wc -l < data/irealb_2025_sorted.csv); 
sa=$(du -h data/irealb_20260503_sorted.csv | cut -f1); 
sb=$(du -h data/irealb_2025_sorted.csv | cut -f1); 

echo "irealb_20260503_sorted.csv: $a lignes | $sa"; 
echo "irealb_2025_sorted.csv: $b lignes | $sb"; 
echo "Différence lignes: $((b-a))"
'
```


# Github Projects about iReal Pro

- https://github.com/infojunkie/chirp
- https://github.com/infojunkie/ireal-musicxml
- https://github.com/este36/musicxml-irealpro
- https://github.com/daumling/ireal-renderer
- https://github.com/memowe/pyrealpro-format/tree/main