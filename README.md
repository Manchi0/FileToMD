# Docling Markdown Converter

A simple desktop app to convert documents (PDF, DOCX, PPTX, images, etc.) to Markdown.

## Setup

### Windows

```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python converter.py
```

### Mac

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python converter.py
```

## Supported Formats

- PDF
- DOCX (Word)
- PPTX (PowerPoint)
- XLSX (Excel)
- HTML
- Images (PNG, JPG, TIFF, BMP)

## Usage

1. Click "Browse" to select a file
2. Click "Convert to Markdown"
3. Choose where to save the .md file
4. Done!
