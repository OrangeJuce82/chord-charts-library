"""
CLI iReal Pro → CSV
Usage: python ireal_cli.py <input_file> <output_file> [OPTIONS]

Each line of the input file can be:
  - a raw irealb:// or irealbook:// URL
  - a blank line (ignored)
  - a comment starting with # (ignored)
"""

from __future__ import annotations

import csv
import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import unquote

import typer
from rich.console import Console
from rich.progress import track
from rich.table import Table

# ---------------------------------------------------------------------------
# Import the parser (must be in the same directory or on PYTHONPATH)
# ---------------------------------------------------------------------------
try:
    from ireal_parser import Playlist, Song
except ImportError:
    typer.echo(
        "[ERROR] Could not import ireal_parser.py. "
        "Make sure it is in the same directory as this script.",
        err=True,
    )
    raise SystemExit(1)

app = typer.Typer(
    name="ireal-cli",
    help="Parse iReal Pro URLs and export song metadata to CSV.",
    add_completion=False,
)
console = Console()

# ---------------------------------------------------------------------------
# CSV fields in desired output order (id prepended when --uuid is active)
# ---------------------------------------------------------------------------
CSV_FIELDS_BASE = [
    "url",
    "title",
    "composer",
    "style",
    "key",
    "transpose",
    "groove",
    "bpm",
    "repeats",
]


def _song_to_row(song: Song, raw_url: str, add_uuid: bool) -> dict:
    """Convert a Song object to a CSV row dict."""
    row: dict = {}
    if add_uuid:
        row["id"] = str(uuid.uuid4())
    row.update({
        "url": raw_url,
        "title": song.title,
        "composer": song.composer,
        "style": song.style,
        "key": song.key,
        "transpose": song.transpose,
        "groove": song.groove,
        "bpm": song.bpm,
        "repeats": song.repeats,
    })
    return row


def _parse_url(raw_url: str) -> list[Song]:
    """
    Parse an irealb:// or irealbook:// URL and return the list of Songs.
    Raises ValueError if the URL is invalid.
    """
    playlist = Playlist(raw_url)
    return playlist.songs


@app.command()
def main(
    input_file: Path = typer.Argument(
        ...,
        exists=True,
        readable=True,
        help="Text file containing one iReal Pro URL per line.",
    ),
    output: Path = typer.Argument(
        ...,
        help="Output CSV file path.",
    ),
    add_uuid: bool = typer.Option(
        True,
        "--uuid/--no-uuid",
        help="Prepend a UUID v4 'id' column to each row (default: enabled).",
    ),
    delimiter: str = typer.Option(
        ",",
        "--delimiter",
        "-d",
        help="CSV delimiter (default: comma).",
    ),
    show_preview: bool = typer.Option(
        True,
        "--preview/--no-preview",
        help="Print a preview table in the terminal.",
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Show error details for failed URLs.",
    ),
):
    """
    Parse an iReal Pro URL file and export song metadata to CSV.

    \b
    Example:
        python ireal_cli.py my_links.txt output.csv
        python ireal_cli.py my_links.txt output.csv --no-uuid
        python ireal_cli.py my_links.txt output.csv -d ";"
    """
    # Build field list depending on uuid flag
    csv_fields = (["id"] + CSV_FIELDS_BASE) if add_uuid else CSV_FIELDS_BASE

    # Read and filter URLs
    lines = input_file.read_text(encoding="utf-8").splitlines()
    urls = [
        line.strip()
        for line in lines
        if line.strip() and not line.strip().startswith("#")
    ]

    if not urls:
        console.print("[yellow]⚠ No URLs found in the input file.[/yellow]")
        raise typer.Exit(0)

    console.print(f"[bold cyan]{len(urls)} URL(s) to process…[/bold cyan]")

    rows: list[dict] = []
    errors: list[tuple[str, str]] = []

    for raw_url in track(urls, description="Parsing…", console=console):
        try:
            songs = _parse_url(raw_url)
            if not songs:
                errors.append((raw_url, "No songs found"))
                continue
            for song in songs:
                rows.append(_song_to_row(song, raw_url, add_uuid))
        except Exception as exc:
            errors.append((raw_url, str(exc)))
            if verbose:
                console.print(f"[red]  ✗ {raw_url[:80]}…[/red]")
                console.print(f"     → {exc}")

    # Write CSV
    with output.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=csv_fields, delimiter=delimiter)
        writer.writeheader()
        writer.writerows(rows)

    console.print(
        f"\n[green]✓ {len(rows)} song(s) exported → [bold]{output}[/bold][/green]"
    )

    if errors:
        console.print(
            f"[yellow]⚠ {len(errors)} URL(s) failed:[/yellow]"
        )
        for url, msg in errors:
            short = url[:70] + ("…" if len(url) > 70 else "")
            console.print(f"  [red]✗[/red] {short}")
            if verbose:
                console.print(f"     [dim]{msg}[/dim]")

    # Terminal preview (url column hidden for readability)
    if show_preview and rows:
        preview_rows = rows[:10]
        preview_cols = (["id"] if add_uuid else []) + [
            "title", "composer", "style", "key", "bpm", "groove", "transpose", "repeats"
        ]
        table = Table(title=f"Preview ({len(preview_rows)} / {len(rows)})", show_lines=False)
        for col in preview_cols:
            style = "cyan" if col == "title" else ("dim" if col == "id" else "")
            table.add_column(col, style=style)
        for row in preview_rows:
            # Truncate uuid for readability in preview
            def fmt(col: str, val: str) -> str:
                return val[:8] + "…" if col == "id" else val
            table.add_row(*[fmt(c, str(row[c])) for c in preview_cols])
        console.print()
        console.print(table)


if __name__ == "__main__":
    app()