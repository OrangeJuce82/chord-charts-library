import re
from html import unescape
from urllib.parse import unquote_plus

from ccl.commons.base_enum import BaseEnum
from ccl.db.models import Chart


class IRealProScheme(BaseEnum):
    """Enum for iRealPro schemes"""
    IREALB = 'irealb'
    IREALBOOK = 'irealbook'


class IRealProUrl:
    """Simple class to parse iRealPro URL

     Examples
    --------
    >>> url = 'irealb://Yats%C4%B1n%20Y0-D%20Z%20LD[...]g%3D100%3D3'
    >>> charts = IRealProChart(url)
    """
    meta_separator = r'%3D|='

    def __init__(self, url):
        if not isinstance(url, str):
            raise TypeError('URL is not a string.')

        self.scheme, self.path = IRealProUrl.split_scheme_and_path(url)
        IRealProUrl.check_scheme_exists(self.scheme)
        metas = re.split(self.meta_separator, self.path)
        self.metas = list(map(lambda x: unescape(unquote_plus(x)).strip(), metas))

    def __str__(self):
        return f'{self.scheme}://{self.path}'

    @staticmethod
    def split_scheme_and_path(url):
        url = url.strip()
        pos = url.find('://')
        assert pos != -1, f"We can't find `://` in the url : {url}"
        return url[:pos], url[pos + 3:]

    @staticmethod
    def check_scheme_exists(scheme):
        assert IRealProScheme.has_value(scheme), 'Scheme must be irealb or irealbook'

    @classmethod
    def make_charts(cls, url):
        """Factory method to make multiple charts from one single URL

        Description
        -----------
        Because sometimes, URL can contains multiple charts, we parse the URL then return a IRealProChart list

        Returns
        -------
        charts : list
            Charts parsed from the URL
        """
        if not isinstance(url, str):
            raise TypeError('URL is not a string.')

        scheme, path = IRealProUrl.split_scheme_and_path(url)
        IRealProUrl.check_scheme_exists(scheme)
        metas_pack = re.split(IRealProUrl.meta_separator, path)
        step = 12 if scheme == IRealProScheme.IREALB.value else 6
        playlist = metas_pack[-1] if len(metas_pack) % step == 1 else None

        # Keep only valid metas chunks
        meta_chunks = []
        for x in range(0, len(metas_pack), step):
            metas = metas_pack[x:x + step]
            if any(metas) and len(metas) > 1:
                meta_chunks.append(metas)

        for metas in meta_chunks:
            if metas and len(metas) == step:
                path = "=".join(metas)
                yield IRealProChart(f'{scheme}://{path}', playlist)


class IRealProChart(Chart):
    """IRealProChart class

    Examples
    --------
    >>> url = 'irealb://Yats%C4%B1n%20Y0-D%20Z%20LD[...]g%3D100%3D3'
    >>> charts = IRealProChart(url)
    """

    class Meta:
        table_name = 'chart'

    def __init__(self, url, playlist=None):
        """IRealProChart constructor

        Parameters
        ----------
        url : str
            The URL of the chart
        """
        self.url = url if isinstance(url, IRealProUrl) else IRealProUrl(url)
        self.playlist = playlist
        self.is_realb = self.url.scheme == IRealProScheme.IREALB.value

        # Merge metas with empty list to avoid problems if metas are not filled correctly
        metas = [None] * 12
        metas[:len(self.url.metas)] = self.url.metas

        # Format composer : Mysterious hack from iRealPro
        composer = metas[1]
        if composer.count(' ') == 1:
            last_name, first_name = composer.split(' ')
            composer = f'{first_name} {last_name}'

        # Call the parent constructor with the base attributes
        Chart.__init__(
            self,
            title=metas[0],
            composer=composer,
            style=metas[3 if self.is_realb else 2],
            tone=metas[4 if self.is_realb else 3],
            data_type=IRealProChart.__name__,
            data=url,
        )

        # Fill other attributes
        self.time_signature = metas[4]
        self.chart = IRealProChart.decrypt(metas[6]) if self.is_realb else metas[5]
        self.sequencer_style = metas[7]
        self.bmp = metas[8]
        self.repeats = metas[9]

    @staticmethod
    def decrypt(encrypted):
        """Decrypt

        Parameters
        ----------
        encrypted : str
            The encrypted path

        Returns
        -------
        decrypted : str
            The decrypted path

        References
        ----------
        .. [1] https://github.com/realtimerealbook/ireal-parse/blob/master/src/unscramble.js
        """
        decrypted = ''
        while len(encrypted) > 50:
            chunck, encrypted = encrypted[:50], encrypted[50:]
            if len(encrypted) < 2:
                decrypted += chunck
            else:
                # the first 5 characters are switched with the last 5 then characters from 10 to 24 are also switched
                decrypted += (
                        chunck[45:50][::-1] + chunck[5:10] +
                        chunck[26:40][::-1] + chunck[24:26] + chunck[10:24][::-1] +
                        chunck[40:45] + chunck[0:5][::-1]
                )
        decrypted = decrypted + encrypted
        return decrypted
