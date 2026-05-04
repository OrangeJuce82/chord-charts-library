"""
The iReal Pro parser is derived from
https://github.com/daumling/ireal-renderer
which is itself derived from
https://github.com/pianosnake/ireal-reader

None of those modules did exactly what is needed here, namely return
a full structure that can be iterated downstream.
"""

import re
import difflib
from urllib.parse import unquote
from dataclasses import dataclass, field
from typing import Optional


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
# Diff helper  (replaces the fast-diff npm package)
# ---------------------------------------------------------------------------


def _diff(a: str, b: str) -> list[tuple[int, str]]:
    """
    Character-level diff of two strings using difflib.SequenceMatcher,
    returning a list of (op, text) tuples that mirrors the fast-diff format:
      0  = equal
      1  = inserted (in b but not a)
     -1  = deleted  (in a but not b)

    Used by Playlist to detect multi-part songs: the parts of the same song
    have the same title except for the part number, so the first diff op must
    be an equality and every differing run must consist solely of digits.
    """
    matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
    result = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            result.append((0, a[i1:i2]))
        elif tag == "replace":
            result.append((-1, a[i1:i2]))
            result.append((1, b[j1:j2]))
        elif tag == "delete":
            result.append((-1, a[i1:i2]))
        elif tag == "insert":
            result.append((1, b[j1:j2]))
    return result


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

    def __init__(
        self, encoded_part: str, old_format: bool = False, scheme: str = "irealb"
    ):
        self.cells: list[Cell] = []
        self.music_xml: str = ""
        # Raw segment string as extracted from the playlist URL (before any parsing).
        # Used to reconstruct the original irealb:// URL for export.
        self.encoded_part: str = encoded_part
        # URL scheme: 'irealb' (new format) or 'irealbook' (old format).
        # Preserved so the original URL can be reconstructed exactly.
        self.scheme: str = scheme

        ireal: str = unquote(encoded_part)
        if not ireal:
            self.title = ""
            self.composer = ""
            self.style = ""
            self.key = ""
            self.transpose = 0
            self.groove = ""
            self.bpm = 0
            self.repeats = 0
            return

        parts = ireal.split("=")  # split on one sign, remove the blanks
        if old_format:
            self.title = Song.parse_title(parts[0].strip())
            self.composer = Song.parse_composer(parts[1].strip())
            self.style = parts[2].strip()
            self.key = parts[3]
            self.cells = self._parse(parts[5])
        else:
            self.title = Song.parse_title(parts[0].strip())
            self.composer = Song.parse_composer(parts[1].strip())
            self.style = parts[3].strip()
            self.key = parts[4]
            self.transpose = int(parts[5]) if parts[5] else 0
            self.groove = parts[7]
            self.bpm = int(parts[8]) if parts[8] else 0
            self.repeats = int(parts[9]) if parts[9] else 3
            music = parts[6].split("1r34LbKcu7")
            self.cells = self._parse(_unscramble(music[1]))

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
                    if len(m.groups()) == 0:
                        arr.append(m.group(0))
                        text = text[m.end() :]
                    else:
                        # a chord
                        arr.append(m)
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
    def __init__(self, ireal: str):
        playlist_encoded = re.search(r'.*?(irealb(?:ook)?):\/\/([^"]*)', ireal)
        if not playlist_encoded:
            raise ValueError("No iReal Pro URL found in input")

        encoded_playlist = playlist_encoded.group(2)
        encoded_parts = re.split(
            r"===|%3D%3D%3D", encoded_playlist
        )  # songs are separated by ===

        if len(encoded_parts) > 1:
            self.name = unquote(encoded_parts.pop())  # playlist name
        else:
            self.name = ""

        songs: list[Song] = []
        for encoded_part in encoded_parts:
            try:
                scheme = playlist_encoded.group(1)  # 'irealb' or 'irealbook'
                song = Song(
                    encoded_part, old_format=(scheme == "irealbook"), scheme=scheme
                )

            except Exception as error:
                part = unquote(encoded_part)
                title = Song.parse_title(part.split("=")[0].strip())
                print(f"[ireal-parser] [{title}] {error}")
                song = None

            if song is None:
                continue

            songs.append(song)

        self.songs = songs
