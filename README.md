# chord-charts-library
A chord chart library


## Scraping
To scrape data from irealb.com, run the spider with:
```
uv run scrapy crawl irealb
```


This will start the IRealB spider and collect chord chart data.


## Post Processing

Clean, Sort then filter duplicate lines once crawling is finished

```
sed 's/"//g' data/irealb_urls_20260503.txt > data/irealb_urls_20260503_cleaned.txt
sort data/irealb_urls_20260503_cleaned.txt | uniq > data/irealb_urls_20260503_sorted.txt
```

Then run CLI to make a CSV with song and metadata

```
uv run cli/ireal_song_extractor.py data/irealb_urls_20260503_sorted.txt irealb_songs_20260503.txt
uv run cli/ireal_csv_maker.py data/irealb_songs_20260503.txt data/irealb_songs_with_metadata_20260503.csv
```


# Github Projects about iReal Pro

- https://github.com/infojunkie/chirp
- https://github.com/infojunkie/ireal-musicxml
- https://github.com/este36/musicxml-irealpro
- https://github.com/daumling/ireal-renderer
- https://github.com/memowe/pyrealpro-format/tree/main