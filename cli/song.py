import re
from enum import Enum
from urllib.parse import unquote_plus


# url = "irealb://A%C5%9EK%20HER%C5%9EEY%C4%B0%20AFFEDER%20M%C4%B0%3F%20%28Synth%20Bass%29%3DTekin%20%C3%96zlem%3D%3DRock%20Pop%3DF%23-%3D%3D1r34LbKcu7*%3CS%7B%204%3C*69yXZLxZLxZLxZL-F%23%3E%29htnys.byeK%28%20QXyQ%204Ti*%7CA*%7B%7D%20%20%20%28BaLxZLxZLxZLxZLxLZ-%23F%3E%29slacoV%26ssZxLZxQyX27ZLDZLxLZxL/EZLxZL-%23FB*%7B%7Dx%20ZL%23CZLxZLDZLxZF%23LZxZL-%23F%29smurLZx%20%7D%2096*%3CC*%5BQyXQyXyQXQyXZLSxZL-%23F%7C%28No%20d%23CZLx%3E%29catZxLZx%3CZL%23CZLxZLDZLxLZEZLxZL-%23FZLxZL*74%28AL-%23F%3EZL-%23FQXyQ%20L%23CZLxZLDZLxZLF%23/EZLxZL-%23FB*%7B%20Zx%20%7D%7CyX%5D%20xx%20%7C%20%3DPop-Rock%3D115%3D1"
# new_url = "%7C%2AiT44%3C%2A69+%28Keyb.synth%29%3EF%23-LZxLZxLZxLZXyQXyQ++%7BS%3C%2A72XyQ++%28Bass%26Vocals%29%3EF%23-LZxLZxLZxLZxLZxLZxLZx+%7D%7B%2AAF%23-LZxLZxLZxLZDLZxLZC%23LZx+%7D%7B%2ABF%23-LZxLZE%2FF%23LZxLZDLZxLZC%23LZx+%7D%7CF%23-LZxSLZXyQXyQXyQXyQ%5B%2AC%3C%2A69+%28No+drums%29%3EF%23-LZxLZxLZxLZF%23-LZxLZELZxLZDLZxLZC%23LZ%3C%2A74%28Atac%29%3Ex+%5DXyQXyQ++%7B%2ABF%23-LZxLZE%2FF%23LZxLZDLZxLZC%23LZx+%7D%7CF%23-LZx+%7C"
#
# # url = "irealbook://King%20Harvest%20%28Has%20Surely%20Come%29%3DThe%20Band%3DRock%3DC%3Dn%3D%5B%2C*i%2CT44A-%20%20%20%7C%20%20%20%20%5D%20%20%20%20%20%20%20%20%5B%2CS%2CT44C%20Bb%20%7CAb%20Eb%2CBb/D%20%7CT24C%20%20%7C%20%20%20%20%7CA-%20%20%20%7CG%20%20%20%7CBb%20F%20%7CC%20%20%20%7CA-%20%20%20%7CF%20%20%20%7CD-%20%20%20%7CE%20%20%20%7C%7BA-%20Bb%20%7CC%20%3C4x%3E%20%7DA%2CG%2CBb%2C%3CD.S.%3EFZ%20"


class Song:
    def __init__(self, title, composer, style, tone):
        self.title = title
        self.composer = composer
        self.style = style
        self.tone = tone


class IrealProScheme(Enum):
    IREALB = "irealb"
    IREALBOOK = "irealbook"

    @classmethod
    def has_value(cls, value):
        return value in cls._value2member_map_


class IrealProChart(Song):
    """
    song = IrealProChart.parse_url(url)
    """

    def __init__(self, url):
        scheme, data = url.strip().split("://")
        if not IrealProScheme.has_value(scheme):
            raise ValueError("This url is not a valid Irealb song")

        metas = IrealProChart.get_metas(data)
        if not IrealProChart.check_metas(scheme, metas):
            raise ValueError('metas inside url are not valid')
        self.url = url
        self.scheme = scheme
        self.metas = metas

    def is_realb(self):
        return self.scheme == IrealProScheme.IREALB.value

    def is_realbook(self):
        return self.scheme == IrealProScheme.IREALBOOK.value

    @property
    def title(self):
        return self.metas[0]

    @property
    def composer(self):
        return self.metas[1]

    @property
    def key(self):
        return self.metas[4 if self.is_realb() else 3]

    @property
    def style(self):
        return self.metas[3 if self.is_realb() else 2]

    @property
    def sequencer_style(self):
        return self.metas[7] if self.is_realb() else None

    @property
    def bpm(self):
        return self.metas[8] if self.is_realb() else None

    @property
    def repeats(self):
        return self.metas[9] if self.is_realb() else None

    @property
    def time_signature(self):
        return self.metas[4] if self.is_realbook() else None

    @property
    def chart_irealb(self):
        if self.is_realb():
            return IrealProChart.decrypt(self.metas[6])
        else:
            return self.metas[5]

    @classmethod
    def from_url(cls, url):
        """Parse the URL then return a IrealProChart object"""
        scheme, data = url.strip().split("://")
        if not IrealProScheme.has_value(scheme):
            raise ValueError("This url is not a valid Irealb song")

        song_urls = IrealProChart.split_song_urls(data)
        return [IrealProChart(f"{scheme}://{song_url}") for song_url in song_urls]

    @staticmethod
    def decrypt(s):
        """
        source : https://github.com/realtimerealbook/ireal-parse/blob/master/src/unscramble.js
        """
        r, s = "", s
        while len(s) > 50:
            p, s = s[:50], s[50:]
            if len(s) < 2:
                r += p
            else:
                # the first 5 characters are switched with the last 5 then characters from 10 to 24 are also switched
                r += p[45:50][::-1] + p[5:10] + p[26:40][::-1] + p[24:26] + p[10:24][::-1] + p[40:45] + p[0:5][::-1]
        r = r + s
        return r

    @staticmethod
    def check_metas(scheme, metas):
        if scheme == IrealProScheme.IREALB.value:
            return len(metas) == 10
        elif scheme == IrealProScheme.IREALBOOK.value:
            return len(metas) == 6

    @staticmethod
    def split_song_urls(data):
        """Split songs"""
        return re.split(r"%3D%3D%3D|===", data)

    @staticmethod
    def get_metas(url):
        """Get song metas"""
        return list(map(unquote_plus, re.split(r"%3D|=", url)))


with open("/Users/florian/GitHub/chord-charts-library/data/ireal_songs_modif.csv", "r") as csv:
    urls = csv.read().splitlines()

songs = []
for url in urls[:1000]:
    songs += IrealProChart.from_url(url)

irealbooks = [song for song in songs if song.is_realbook()]
irealbs = [song for song in songs if song.is_realb()]
