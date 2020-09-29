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

for url in urls:
    if url != 'chart':
        for chart in IRealProUrl.make_charts(url):
            if chart:
                print(chart.title)
                chart.save()

# # url = "irealbook://Aprikosen%20ess%20ich%20gern=Kinderlied%20umgedichtetes=Medium%20Swing=G=n=%5b%2aAT44G%2a%2a%2c%20D7%2c%20%7cG%2a%2a%2c%20G%2a%2a%2c%20%7cG%2a%2a%2c%20D7%2c%20%7cG%2a%2a%2c%20G%2a%2a%2c%20%7cG%2a%2a%2c%20G%2a%2a%2c%20%7cG%2a%2a%2c%20G%2a%2a%2c%20%7cD7%2c%20D7%2c%20%7cG%2a%2a%2c%20G%2a%2a%2c%20%5d%20=Fly%20like%20an%20eagle=Song%20Indian=Medium%20Swing=G=n=%5b%2aAT44G%2c%20%20%20%7cG%2c%20%20%20%7cG%2c%20%20%20%7cG%2c%20%20%20%7cG%2c%20%20%20%7cG%2c%20%20%20%7cD7%2c%20%20%20%7cD7%2c%20%20%20%5d%20=Ist%20ein%20Heft%20vom%20Tisch%20gefallen=Kinderlied%20umgedichtetes=Medium%20Swing=C=n=%5b%2aAT44C%2a%2a%2cC%2a%2a%2cC%2a%2a%2cC%2a%2a%7cG%2a%2a%2cG%2a%2a%2cG%2a%2a%2cG%2a%2a%7cC%2a%2a%2cC%2a%2a%2cC%2a%2a%2cC%2a%2a%7cG%2a%2a%2c%20G%2a%2a%2c%20%7cC%2a%2a%2cC%2a%2a%2cC%2a%2a%2cC%2a%2a%7cG%2a%2a%2cG%2a%2a%2cG%2a%2a%2cG%2a%2a%7cG%2a%2a%2cG%2a%2a%2cG%2a%2a%2cG%2a%2a%7cC%2a%2a%2c%20C%2c%20%5d%20=chaba"
# import re
# scheme, path = IRealProUrl.split_scheme_and_path(url)
# IRealProUrl.check_scheme_exists(scheme)
# metas_pack = re.split(IRealProUrl.meta_separator, path)
# step = 10 if scheme == IRealProScheme.IREALB.value else 6
# if len(metas_pack) % step == 1:
#     playlist = metas_pack[-1]
#     print("playlist >> ", playlist)
#
# [i.title for i in list(IRealProUrl.make_charts(url))]
