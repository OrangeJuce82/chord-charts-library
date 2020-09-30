import os

from ccl.charts.ireal_pro_chart import IRealProUrl, IRealProScheme, IRealProChart

filepath = "/Users/florian/GitHub/chord-charts-library/data/irealb.csv"
with open(filepath, "r") as csv:
    data = csv.read()
    data = data.replace('<br />\n', '<br />')
    data = data.replace('"', '')
    data = "\n".join(set(data.splitlines()))  # remove duplicate lines

base, ext = os.path.splitext(filepath)
new_filepath = f'{base}_new{ext}'
with open(new_filepath, "w") as csv:
    csv.write(data)

with open(new_filepath, "r") as csv:
    urls = csv.read().splitlines()

i = 0
for url in urls:
    if url != 'chart':
        for chart in IRealProUrl.make_charts(url):
            if chart:
                i += 1
                print(f"{i} : {chart.title}")
                chart.save()
