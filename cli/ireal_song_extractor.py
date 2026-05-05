"""
iReal Pro playlist merger and deduplicator.

Usage:
    python ireal_song_extractor.py INPUT OUTPUT [--playlist-name NAME] [--verbose]

Reads a file where each line is an irealb:// playlist URL, extracts all songs
from every playlist, removes duplicates (by title + composer), and writes the
merged result as a single irealb:// URL to the output file.
"""

from pathlib import Path

import typer

# ---------------------------------------------------------------------------
# Import the parser (expected alongside this script or on PYTHONPATH)
# ---------------------------------------------------------------------------
try:
    from ireal_parser import Playlist, Song
except ImportError:
    typer.echo(
        "Error: ireal_parser.py not found. "
        "Place it in the same directory as this script.",
        err=True,
    )
    raise SystemExit(1)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

app = typer.Typer(
    name="ireal-song-extractor",
    help="Merge multiple iReal Pro playlist URLs into one deduplicated playlist.",
    add_completion=False,
)


@app.command()
def merge(
    input_file: Path = typer.Argument(
        ...,
        exists=True,
        readable=True,
        help="Input file — one irealb:// playlist URL per line.",
    ),
    output_file: Path = typer.Argument(
        ...,
        help="Output file — will contain the merged irealb:// URL.",
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Print progress details to stderr.",
    ),
    capture_failed: bool = typer.Option(
        False,
        "--cap-failed",
        help="Capture failed urls.",
    ),
) -> None:
    """
    Read INPUT_FILE (one irealb:// URL per line), parse every playlist,
    collect all songs, deduplicate by title + composer, and write a single
    merged irealb:// URL to OUTPUT_FILE.
    """

    def log(msg: str) -> None:
        if verbose:
            typer.echo(msg, err=True)

    # ------------------------------------------------------------------
    # 1. Read input lines
    # ------------------------------------------------------------------
    lines = [l.strip() for l in input_file.read_text(encoding="utf-8").splitlines()]
    lines = [l for l in lines if l]  # drop blank lines
    if not lines:
        typer.echo("Error: input file is empty.", err=True)
        raise typer.Exit(1)

    log(f"Found {len(lines)} playlist URL(s) in '{input_file}'.")

    # ------------------------------------------------------------------
    # 2. Parse every playlist, collect songs with their raw parts
    # ------------------------------------------------------------------
    seen: dict[str, Song] = {}  # dedup key → first-seen Song
    failed: list[str] = []
    total_raw = 0

    for line_no, url in enumerate(lines, start=1):
        try:
            playlist = Playlist.from_url(url)
        except Exception as exc:
            failed.append(url)
            typer.echo(
                f"Warning: could not parse line {line_no} \n{exc}\n",
                err=True,
            )
            continue

        log(
            f"  Playlist '{playlist.name or '(unnamed)'}': "
            f"{len(playlist.songs)} song(s)."
        )
        total_raw += len(playlist.songs)

        for song in playlist.songs:
            key = song.encoded_part
            if key not in seen:
                seen[key] = song
                log(f"    + {song.title} — {song.composer}")
            else:
                log(f"    ~ duplicate skipped: {song.title} — {song.composer}")

    if not seen:
        typer.echo("Error: no songs found in input.", err=True)
        raise typer.Exit(1)

    if capture_failed and len(failed) > 0:
        failed_path = input_file.with_name(
            f"{input_file.stem}_failed{input_file.suffix}"
        )
        failed_path.write_text("\n".join(failed) + "\n", encoding="utf-8")

    unique_songs = list(seen.values())
    duplicates_removed = total_raw - len(unique_songs)

    log(
        f"\nTotal collected : {total_raw} song(s)\n"
        f"Unique           : {len(unique_songs)} song(s)\n"
        f"Duplicates removed: {duplicates_removed}"
    )

    # ------------------------------------------------------------------
    # 3. Write one irealb:// URL per song, one per line
    # ------------------------------------------------------------------
    lines = [song.url for song in unique_songs]
    output_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ------------------------------------------------------------------
    # 4. Summary (always printed)
    # ------------------------------------------------------------------
    typer.echo(
        f"Done. {len(unique_songs)} unique song(s) written to '{output_file}' "
        f"({duplicates_removed} duplicate(s) removed)."
    )


if __name__ == "__main__":
    app()
