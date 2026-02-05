#!/usr/bin/env python3
"""
Docling Converter CLI - Convert documents to Markdown

Usage:
    python converter.py --input file.pdf --output ./output/
    python converter.py --input file1.pdf file2.docx --output ./output/
    python converter.py --input ./documents/ --output ./converted/

Outputs JSON progress to stdout for IPC with Electron.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import List, Optional

# Supported file extensions
SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.xlsx', '.html', '.htm',
                        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'}


def emit_status(status: str, message: str = "", file: str = "",
                progress: int = 0, total: int = 0, error: str = ""):
    """Emit JSON status to stdout for Electron IPC."""
    data = {
        "status": status,
        "message": message,
        "file": file,
        "progress": progress,
        "total": total,
        "error": error
    }
    print(json.dumps(data), flush=True)


def get_unique_output_path(output_path: Path) -> Path:
    """Generate unique filename if file already exists (file.md -> file_1.md -> file_2.md)."""
    if not output_path.exists():
        return output_path

    base = output_path.stem
    ext = output_path.suffix
    parent = output_path.parent
    counter = 1

    while True:
        new_path = parent / f"{base}_{counter}{ext}"
        if not new_path.exists():
            return new_path
        counter += 1


def collect_files(input_paths: List[str]) -> List[Path]:
    """Collect all files to convert from input paths (files or directories)."""
    files = []

    for input_path in input_paths:
        path = Path(input_path)

        if path.is_file():
            if path.suffix.lower() in SUPPORTED_EXTENSIONS:
                files.append(path)
            else:
                emit_status("warning", f"Unsupported file format: {path.suffix}", str(path))
        elif path.is_dir():
            # Recursively collect files from directory
            for file_path in path.rglob('*'):
                if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                    files.append(file_path)
        else:
            emit_status("error", f"Path does not exist: {input_path}", input_path)

    return files


def get_output_path(input_file: Path, input_base: Path, output_dir: Path) -> Path:
    """Calculate output path maintaining directory structure."""
    try:
        # Get relative path from input base
        relative = input_file.relative_to(input_base)
        output_path = output_dir / relative.with_suffix('.md')
    except ValueError:
        # File is not relative to input_base, just use filename
        output_path = output_dir / input_file.with_suffix('.md').name

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    return get_unique_output_path(output_path)


def convert_file(input_file: Path, output_file: Path) -> bool:
    """Convert a single file to Markdown using Docling."""
    try:
        from docling.document_converter import DocumentConverter

        converter = DocumentConverter()
        result = converter.convert(str(input_file))
        markdown_content = result.document.export_to_markdown()

        output_file.write_text(markdown_content, encoding='utf-8')
        return True

    except Exception as e:
        emit_status("error", str(e), str(input_file), error=str(e))
        return False


def main():
    parser = argparse.ArgumentParser(description='Convert documents to Markdown using Docling')
    parser.add_argument('--input', '-i', nargs='+', required=True,
                        help='Input file(s) or folder(s)')
    parser.add_argument('--output', '-o', required=True,
                        help='Output directory')

    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    emit_status("starting", "Collecting files...")

    # Collect all files to convert
    files = collect_files(args.input)

    if not files:
        emit_status("error", "No supported files found", error="No supported files found")
        sys.exit(1)

    total = len(files)
    emit_status("ready", f"Found {total} file(s) to convert", total=total)

    # Determine base path for relative output structure
    if len(args.input) == 1 and Path(args.input[0]).is_dir():
        input_base = Path(args.input[0])
    else:
        # For multiple files or single file, use parent directory
        input_base = files[0].parent if files else Path('.')

    successful = 0
    failed = 0
    results = []

    for idx, input_file in enumerate(files, 1):
        emit_status("converting", f"Converting: {input_file.name}",
                   str(input_file), progress=idx, total=total)

        output_file = get_output_path(input_file, input_base, output_dir)

        if convert_file(input_file, output_file):
            successful += 1
            results.append({"input": str(input_file), "output": str(output_file), "success": True})
            emit_status("converted", f"Converted: {input_file.name}",
                       str(input_file), progress=idx, total=total)
        else:
            failed += 1
            results.append({"input": str(input_file), "output": "", "success": False})

    # Emit final summary
    summary = {
        "status": "complete",
        "message": f"Conversion complete: {successful} succeeded, {failed} failed",
        "successful": successful,
        "failed": failed,
        "total": total,
        "results": results
    }
    print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()
