import re
from enum import Enum
from urllib.parse import unquote_plus

url = "irealb://A%C5%9EK%20HER%C5%9EEY%C4%B0%20AFFEDER%20M%C4%B0%3F%20%28Synth%20Bass%29%3DTekin%20%C3%96zlem%3D%3DRock%20Pop%3DF%23-%3D%3D1r34LbKcu7*%3CS%7B%204%3C*69yXZLxZLxZLxZL-F%23%3E%29htnys.byeK%28%20QXyQ%204Ti*%7CA*%7B%7D%20%20%20%28BaLxZLxZLxZLxZLxLZ-%23F%3E%29slacoV%26ssZxLZxQyX27ZLDZLxLZxL/EZLxZL-%23FB*%7B%7Dx%20ZL%23CZLxZLDZLxZF%23LZxZL-%23F%29smurLZx%20%7D%2096*%3CC*%5BQyXQyXyQXQyXZLSxZL-%23F%7C%28No%20d%23CZLx%3E%29catZxLZx%3CZL%23CZLxZLDZLxLZEZLxZL-%23FZLxZL*74%28AL-%23F%3EZL-%23FQXyQ%20L%23CZLxZLDZLxZLF%23/EZLxZL-%23FB*%7B%20Zx%20%7D%7CyX%5D%20xx%20%7C%20%3DPop-Rock%3D115%3D1"
new_url = "%7C%2AiT44%3C%2A69+%28Keyb.synth%29%3EF%23-LZxLZxLZxLZXyQXyQ++%7BS%3C%2A72XyQ++%28Bass%26Vocals%29%3EF%23-LZxLZxLZxLZxLZxLZxLZx+%7D%7B%2AAF%23-LZxLZxLZxLZDLZxLZC%23LZx+%7D%7B%2ABF%23-LZxLZE%2FF%23LZxLZDLZxLZC%23LZx+%7D%7CF%23-LZxSLZXyQXyQXyQXyQ%5B%2AC%3C%2A69+%28No+drums%29%3EF%23-LZxLZxLZxLZF%23-LZxLZELZxLZDLZxLZC%23LZ%3C%2A74%28Atac%29%3Ex+%5DXyQXyQ++%7B%2ABF%23-LZxLZE%2FF%23LZxLZDLZxLZC%23LZx+%7D%7CF%23-LZx+%7C"

# url = "irealbook://King%20Harvest%20%28Has%20Surely%20Come%29%3DThe%20Band%3DRock%3DC%3Dn%3D%5B%2C*i%2CT44A-%20%20%20%7C%20%20%20%20%5D%20%20%20%20%20%20%20%20%5B%2CS%2CT44C%20Bb%20%7CAb%20Eb%2CBb/D%20%7CT24C%20%20%7C%20%20%20%20%7CA-%20%20%20%7CG%20%20%20%7CBb%20F%20%7CC%20%20%20%7CA-%20%20%20%7CF%20%20%20%7CD-%20%20%20%7CE%20%20%20%7C%7BA-%20Bb%20%7CC%20%3C4x%3E%20%7DA%2CG%2CBb%2C%3CD.S.%3EFZ%20"


class Song:
    def __init__(self, title, composer, style, tone):
        self.title = title
        self.composer = composer
        self.style = style
        self.tone = tone


class IrealProScheme(Enum):
    IREALB = "irealb"
    IREALBOOK = "irealbook"


class IrealProSong(Song):
    """

    song = IrealProSong.parse_url(url)
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @classmethod
    def parse_url(cls, url):
        """Parse the URL then return a IrealProChart object"""
        scheme, url_data = url.split("://")
        if scheme == IrealProScheme.IREALB.value:
            return cls(**IrealProSong.parse_irealb(url_data))
        elif scheme == IrealProScheme.IREALBOOK.value:
            return cls(**IrealProSong.parse_irealbook(url_data))
        else:
            raise ValueError("This url is not a valid Irealb song")

    @staticmethod
    def split_songs(data):
        """Split songs"""
        return re.split(r"%3D%3D%3D|===", data)

    @staticmethod
    def split_metas(data):
        """Split song metas"""
        return re.split(r"%3D|=", data)

    @staticmethod
    def get_metas_songs(data):
        songs = IrealProSong.split_songs(data)
        for song in songs:
            yield IrealProSong.split_metas(song)

    @staticmethod
    def parse_irealb(data):
        for metas in IrealProSong.get_metas_songs(data):
            if len(metas) != 10:
                raise ValueError('metas inside data are not valid')

            return dict(
                title=unquote_plus(metas[0]),
                composer=unquote_plus(metas[1]),
                style=unquote_plus(metas[3]),
                tone=unquote_plus(metas[4]),
            )

    @staticmethod
    def parse_irealbook(data):
        for metas in IrealProSong.get_metas_songs(data):
            if len(metas) != 6:
                raise ValueError('metas inside data are not valid')

            return dict(
                title=unquote_plus(metas[0]),
                composer=unquote_plus(metas[1]),
                style=unquote_plus(metas[2]),
                tone=unquote_plus(metas[3]),
            )

        # decoded_data = (
        #         url[45:50][::-1] + url[5:10] + url[26:40][::-1] + url[24:26]
        #         + url[10:24][::-1] + url[40:45] + url[0:5][::-1]
        # )
        # return decoded_data


song = IrealProSong.parse_url(url)
