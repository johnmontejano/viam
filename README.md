# Latin Mass Finder Scraper

This is a Python scraper that extracts Catholic Latin Mass locations from [latinmass.com/find-latin-mass](https://www.latinmass.com/find-latin-mass).

## Requirements

- Python 3.8+
- Playwright
- pandas

## Setup

1. Create a virtual environment (optional but recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```

3. Install Playwright browser binaries:
   ```bash
   playwright install chromium
   ```

## Usage

Run the scraper script:
```bash
python3 scrape_latinmass_map.py
```

## Output

The script will produce the following files in the current directory:
- `raw_network_payloads.json`: A JSON file containing all captured network requests matching relevant keywords.
- `latinmass_locations.csv`: A cleaned and deduplicated CSV containing the final location records.
- `diagnostic_report.txt`: (Generated only if no clean JSON endpoint is found) A report detailing the network endpoints and next best technical approaches.
