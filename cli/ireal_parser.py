"""
iReal Pro URL parser.

Public API
----------
parse_ireal_url(url)          → (scheme, song_parts)
parse_ireal_song(url)         → Song        (raises if URL contains several songs)
parse_ireal_playlist(url)     → Playlist    (one or more songs)

Song.from_url(url)            → Song
Playlist.from_url(url)        → Playlist

Derived from:
  https://github.com/daumling/ireal-renderer
  https://github.com/pianosnake/ireal-reader
"""

import re
from enum import Enum
from urllib.parse import unquote
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class IRealParseError(Exception):
    pass


# ---------------------------------------------------------------------------
# Scheme enum
# ---------------------------------------------------------------------------


class IRealScheme(str, Enum):
    """
    URL scheme used by iReal Pro.

    IREALB     — current format ('irealb://')
    IREALBOOK  — legacy format  ('irealbook://')

    Inheriting from str allows direct use in string contexts
    """

    IREALB = "irealb"
    IREALBOOK = "irealbook"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class Chord:
    note: str
    modifiers: str = ""
    over: Optional["Chord"] = None
    alternate: Optional["Chord"] = None


@dataclass
class Cell:
    annots: list = field(default_factory=list)
    comments: list = field(default_factory=list)
    bars: str = ""
    spacer: int = 0
    chord: Optional[Chord] = None


# ---------------------------------------------------------------------------
# Unscrambling helpers
# ---------------------------------------------------------------------------


def _unscramble(s: str) -> str:
    """
    Unscrambling hints from https://github.com/ironss/accompaniser/blob/master/irealb_parser.lua
    Strings are broken up in 50 character segments. each segment undergoes character substitution
    addressed by _obfusc50().
    Note that a final part of length 50 or 51 is not scrambled.
    Finally need to substitute for Kcl, LZ and XyQ.
    """
    result = ""
    while len(s) > 51:
        result += _obfusc50(s[:50])
        s = s[50:]
    result += s
    # now undo substitution obfuscation
    result = result.replace("Kcl", "| x").replace("LZ", " |").replace("XyQ", "   ")
    return result


def _obfusc50(s: str) -> str:
    """
    Unscramble a single 50-character segment:
    - the first 5 characters are switched with the last 5
    - characters 10-24 are also switched
    Reads from the original string s and writes into a new list to avoid
    overwriting values that are still needed (mirrors the JS behaviour exactly).
    """
    new_string = list(s)
    # the first 5 characters are switched with the last 5
    for i in range(5):
        new_string[49 - i] = s[i]
        new_string[i] = s[49 - i]
    # characters 10-24 are also switched
    for i in range(10, 24):
        new_string[49 - i] = s[i]
        new_string[i] = s[49 - i]
    return "".join(new_string)


# ---------------------------------------------------------------------------
# URL parsing helpers
# ---------------------------------------------------------------------------


def parse_ireal_url(url: str) -> tuple[IRealScheme, list[str]]:
    """
    Parse an iReal Pro URL and return (scheme, song_parts).

    This is the low-level split: it extracts the scheme and the list of
    encoded song strings, without any knowledge of the playlist name.
    The playlist name (last segment when multiple songs are present) is
    left to the caller — see parse_ireal_playlist().

    Returns
    -------
    scheme     : IRealScheme.IREALB or IRealScheme.IREALBOOK
    song_parts : list of encoded segments (may include playlist name as last item)
    """

    m = re.search(r"(irealb(?:ook)?):\/\/(.*)", url, re.DOTALL)
    if not m:
        raise ValueError("No iReal Pro URL found in input")

    scheme = IRealScheme(m.group(1))
    body = m.group(2).rstrip("'\"")
    pattern = r"%20=" if scheme == IRealScheme.IREALBOOK else r"===|%3D%3D%3D"
    encoded_parts = re.split(pattern, body)  # songs are separated by ===

    # Filter empty part
    encoded_parts = [encoded_part for encoded_part in encoded_parts if encoded_part]
    return scheme, encoded_parts


# ---------------------------------------------------------------------------
# Song
# ---------------------------------------------------------------------------


class Song:
    """
    The RegExp for a complete chord. The match array contains:
    1 - the base note
    2 - the modifiers (+-ohd0123456789 and su for sus)
    3 - any comments (may be e.g. add, sub, or private stuff)
    4 - the "over" part starting with a slash
    5 - the top chord as (chord)
    """

    CHORD_RE = re.compile(
        r"^([A-G][b#]?)"
        r"((?:sus|alt|add|[+\-^\dhob#])*)"
        r"(\*.+?\*)*"
        r"(\/[A-G][#b]?)?"
        r"(\(.*?\))?"
    )
    # need the empty captures to match CHORD_RE
    CHORD_RE2 = re.compile(r"^([ Wp])()()(\/[A-G][#b]?)?(\(.*?\))?")

    _REGEXPS = [
        re.compile(r"^\*[a-zA-Z]"),  # section
        re.compile(r"^T\d\d"),  # time measurement
        re.compile(r"^N."),  # repeat marker
        re.compile(r"^<.*?>"),  # comments
        CHORD_RE,
        CHORD_RE2,
    ]

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def __init__(self, encoded_part: str, scheme: IRealScheme = IRealScheme.IREALB):
        self.url: str = f"{scheme.value}://{encoded_part}"
        self.scheme: IRealScheme = scheme
        self.encoded_part: str = encoded_part

        ireal = unquote(encoded_part)
        if not ireal:
            self.title = self.composer = self.style = self.key = self.groove = ""
            self.transpose = self.bpm = self.repeats = 0
            self.cells: list[Cell] = []
            return

        parts = ireal.split("=")

        def get(i, default=""):
            return parts[i] if i < len(parts) else default

        if scheme == IRealScheme.IREALBOOK:
            if len(parts) > 6:
                raise Exception(f"Too many parts: {len(parts)} (expected < 6)")

            self.title = self.parse_title(get(0, "").strip())
            self.composer = self.parse_composer(get(1, "").strip())
            self.style = get(2, "").strip()
            self.key = get(3, "")
            self.transpose = 0
            self.groove = ""
            self.bpm = 0
            self.repeats = 3

            raw_cells = get(5, "")
            self.cells = self._parse(raw_cells)

        else:
            if len(parts) > 10:
                raise Exception(f"Too many parts: {len(parts)} (expected < 10)")

            self.title = self.parse_title(get(0, "").strip())
            self.composer = self.parse_composer(get(1, "").strip())
            self.style = get(3, "").strip()
            self.key = get(4, "").strip()

            self.transpose = int(get(5, "0") or 0)
            self.groove = get(7, "").strip()
            self.bpm = int(get(8, "0") or 0)
            self.repeats = int(get(9, "3") or 3)

            self.cells = []
            raw_cells = get(6, "")
            if raw_cells.startswith("1r34LbKcu7"):
                raw_cells = raw_cells.split("1r34LbKcu7", 1)[1]
            self.cells = self._parse(_unscramble(raw_cells))

    @classmethod
    def from_url(cls, url: str) -> "Song":
        """Build a Song from a full iReal Pro URL (single song only)."""
        return parse_ireal_song(url)

    # ------------------------------------------------------------------
    # Static helpers
    # ------------------------------------------------------------------

    @staticmethod
    def parse_title(title: str) -> str:
        """
        The title had "A" and "The" at the back (e.g. "Gentle Rain, The")
        """
        return re.sub(r"^(.*)(, )(A|The)$", r"\3 \1", title)

    @staticmethod
    def parse_composer(composer: str) -> str:
        """
        The composer is reversed (last first) if it only has 2 names :shrug:
        Uses re.split with a capturing group to mirror JS String.split(/(\\s+)/),
        which keeps the whitespace tokens in the resulting list.
        """
        parts = re.split(r"(\s+)", composer)  # match and return spaces too
        if len(parts) == 3:  # [last, spaces, first]
            return parts[2] + parts[1] + parts[0]
        return composer

    # ------------------------------------------------------------------
    # Parsing internals
    # ------------------------------------------------------------------

    def _parse(self, ireal: str) -> list[Cell]:
        """
        The parser cracks up the raw music string into several objects,
        one for each cell. iReal Pro works with rows of 16 cell each. The result
        is stored at song.cells.

        Each object has the following properties:

        chord: if non-null, a chord object with these properties:
          note      - the base note (also blank, W = invisible root, p/x/r - pause/bar repeat/double-bar repeat, n - no chord)
          modifiers - the modifiers, like 7, + o etc (string)
          over      - if non-null, another chord object for the under-note
          alternate - if non-null another chord object for the alternate chord
        annots: annotations, a string of:
         *x  - section, like *v, *I, *A, *B etc
         Nx  - repeat bots (N1, N2 etc)
         Q   - coda
         S   - segno
         Txx - measure (T44 = 4/4 etc, but T12 = 12/8)
         U   - END
         f   - fermata
         l   - (letter l) normal notes
         s   - small notes
        comments: an array of comment strings
        bars: bar specifiers, a string of:
         | - single vertical bar, left
         [ - double bar, left
         ] - double bar, right
         { - repeat bar, left
         } - repeat bar, right
         Z - end bar, right
        spacer - a number indicating the number of vertical spacers above this cell
        """
        text = ireal.strip()
        arr = []
        while text:
            found = False
            for pattern in self._REGEXPS:
                m = pattern.match(text)
                if m:
                    found = True
                    arr.append(m if m.groups() else m.group(0))
                    text = text[m.end() :]
                    break
            if not found:
                # ignore the comma separator
                if text[0] != ",":
                    arr.append(text[0])
                text = text[1:]

        # pass 2: extract prefixes, suffixes, annotations and comments
        cells: list[Cell] = []
        obj = self._new_cell(cells)
        prevobj: Optional[Cell] = None

        for i, item in enumerate(arr):
            cell = item
            if hasattr(item, "group"):  # it's a regex Match object → chord
                obj.chord = self._parse_chord(item)
                cell = " "

            c0 = cell[0]

            if c0 == "{" or c0 == "[":  # open repeat / open double bar
                if prevobj:
                    prevobj.bars += ")"
                    prevobj = None
                obj.bars = cell
                cell = None

            elif c0 == "|":  # single bar - close previous and open this
                if prevobj:
                    prevobj.bars += ")"
                    prevobj = None
                obj.bars = "("
                cell = None

            elif c0 in ("]", "}", "Z"):  # close double bar / close repeat / end bar
                if prevobj:
                    prevobj.bars += cell
                    prevobj = None
                cell = None

            elif c0 == "n":  # N.C.
                obj.chord = Chord(c0)

            elif c0 == ",":
                cell = None  # separator

            elif c0 in ("S", "T", "Q", "N", "U", "s", "l", "f", "*"):
                obj.annots.append(cell)
                cell = None

            elif c0 == "Y":
                obj.spacer += 1
                cell = None
                prevobj = None

            elif c0 in ("r", "x", "W"):
                obj.chord = Chord(cell)

            elif c0 == "<":
                cell = cell[1:-1]
                obj.comments.append(cell)
                cell = None

            if cell is not None and i < len(arr) - 1:
                prevobj = obj  # so we can add any closing barline later
                obj = self._new_cell(cells)

        return cells

    def _parse_chord(self, match) -> Optional[Chord]:
        """
        Build a Chord object from a regex match produced by CHORD_RE or CHORD_RE2.
        Groups mirror the JS match array:
          1 - base note
          2 - modifiers
          3 - inline comment (*...*)
          4 - /over note
          5 - alternate chord in parentheses
        """
        note = match.group(1) or " "
        modifiers = match.group(2) or ""
        comment = match.group(3) or ""
        if comment:
            modifiers += comment[1:-1]

        over = match.group(4) or ""
        if over.startswith("/"):
            over = over[1:]

        alternate = match.group(5) or None
        if alternate:
            chord = Song.CHORD_RE.match(alternate[1:-1])
            alternate = self._parse_chord(chord) if chord else None

        # empty cell?
        if note == " " and not alternate and not over:
            return None

        if over:
            offset = 2 if len(over) > 1 and over[1] in ("#", "b") else 1
            over = Chord(over[:offset], over[offset:], None, None)
        else:
            over = None

        return Chord(note, modifiers, over, alternate)

    @staticmethod
    def _new_cell(cells: list[Cell]) -> Cell:
        """Append a fresh Cell to the list and return it."""
        obj = Cell()
        cells.append(obj)
        return obj


# ---------------------------------------------------------------------------
# Playlist
# ---------------------------------------------------------------------------


class Playlist:
    """A named collection of songs."""

    def __init__(self, name: str, songs: list[Song], url: str = ""):
        self.url: str = url
        self.name: str = name
        self.songs: list[Song] = songs

    @classmethod
    def from_url(cls, url: str) -> "Playlist":
        """Build a Playlist from a full iReal Pro URL."""
        return parse_ireal_playlist(url)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def parse_ireal_song(url: str) -> Song:
    """
    Parse a single-song iReal Pro URL and return a Song.
    Raises ValueError if the URL encodes more than one song.
    """
    scheme, parts = parse_ireal_url(url)
    if len(parts) != 1:
        raise ValueError(
            f"URL contains {len(parts)} songs; use parse_ireal_playlist() instead."
        )
    return Song(parts[0], scheme=scheme)


def parse_ireal_playlist(url: str) -> Playlist:
    """
    Parse an iReal Pro URL and return a Playlist (one or more songs).
    Songs that fail to parse are skipped with a warning.
    """
    scheme, parts = parse_ireal_url(url)

    # Last segment is the playlist name when there are several songs
    if len(parts) > 1:
        playlist_name = unquote(parts.pop())
    else:
        playlist_name = ""

    songs: list[Song] = []
    for part in parts:
        try:
            songs.append(Song(part, scheme=scheme))
        except Exception as exc:
            title = Song.parse_title(unquote(part).split("=")[0].strip())
            raise IRealParseError(
                f"Error during parsing {title}: => {exc}\n{url}\n"
            ) from exc
    return Playlist(name=playlist_name, songs=songs, url=url)
