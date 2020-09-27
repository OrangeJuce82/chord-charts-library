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
    chart_separator = r'%3D%3D%3D|==='
    meta_separator = r'%3D|='

    def __init__(self, url):
        if not isinstance(url, str):
            raise TypeError('URL is not a string.')

        self.scheme, self.path = url.strip().split('://')
        if re.match(self.chart_separator, self.path):
            raise ValueError(
                f'The URL contains {self.chart_separator}, you have to use factory method `IRealProUrl.create_charts`.'
            )

        metas = re.split(self.meta_separator, self.path)
        self.metas = list(map(lambda x: unescape(unquote_plus(x)).strip(), metas))

        if not IRealProScheme.has_value(self.scheme):
            raise ValueError('This url is not a valid iRealPro song')

        if self.scheme == IRealProScheme.IREALB.value and not len(self.metas) == 10:
            raise ValueError('IREALB url must have 10 metas')
        elif self.scheme == IRealProScheme.IREALBOOK.value and not len(self.metas) == 6:
            raise ValueError('IREALBOOK url must have 6 metas')

    def __str__(self):
        return f'{self.scheme}://{self.path}'

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

        scheme, path = url.strip().split('://')
        paths = re.split(IRealProUrl.chart_separator, path)
        for path in paths:
            # Because playlist contains a last not valid path, we check metas before to avoid Exception
            metas = re.split(IRealProUrl.meta_separator, path)
            is_valid = (
                    (scheme == IRealProScheme.IREALB.value and len(metas) == 10)
                    or
                    (scheme == IRealProScheme.IREALBOOK.value and len(metas) == 6)
            )
            if is_valid:
                yield IRealProChart(f'{scheme}://{path}')


class IRealProChart(Chart):
    """IRealProChart class

    Examples
    --------
    >>> url = 'irealb://Yats%C4%B1n%20Y0-D%20Z%20LD[...]g%3D100%3D3'
    >>> charts = IRealProChart(url)
    """

    class Meta:
        table_name = 'chart'

    def __init__(self, url):
        """IRealProChart constructor

        Parameters
        ----------
        url : str
            The URL of the chart
        """
        self.url = url if isinstance(url, IRealProUrl) else IRealProUrl(url)
        metas = self.url.metas
        self.is_realb = self.url.scheme == IRealProScheme.IREALB.value

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
        self.time_signature = None if self.is_realb else metas[4]
        self.chart = IRealProChart.decrypt(metas[6]) if self.is_realb else metas[5]
        self.sequencer_style = metas[7] if self.is_realb else None
        self.bmp = metas[8] if self.is_realb else None
        self.repeats = metas[9] if self.is_realb else None

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
