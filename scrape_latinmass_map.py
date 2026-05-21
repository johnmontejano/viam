import json
import re
import csv
import logging
import pandas as pd
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

URL_KEYWORDS = [
    'map', 'mapbox', 'geojson', 'locations', 'location', 
    'markers', 'pins', 'cms', 'webflow', 'api', 'collection', 'find-latin-mass'
]

CSV_COLUMNS = [
    'church_name', 'address', 'city', 'state', 'country', 
    'latitude', 'longitude', 'hours', 'category_raw', 
    'category_normalized', 'website', 'phone', 'email', 
    'description', 'image_url', 'source_url', 'scraped_at'
]

def process_mapme_payload(data, scraped_at):
    """Specifically extract data from a Mapme API payload."""
    records = []
    try:
        scene = data.get('scene', {})
        sections = scene.get('sections', {})
        categories_dict = scene.get('categories', {})
        
        # Build section_id to category mapping
        section_to_cat = {}
        for cat_id, cat_info in categories_dict.items():
            cat_name = cat_info.get('name', 'Unknown')
            for sec_id in cat_info.get('sections', []):
                section_to_cat[sec_id] = cat_name
                
        for sec_id, sec_info in sections.items():
            name = sec_info.get('name', '')
            address = sec_info.get('address', '')
            lat = sec_info.get('mapView', {}).get('center', {}).get('lat', '')
            lng = sec_info.get('mapView', {}).get('center', {}).get('lng', '')
            desc = sec_info.get('description', '')
            website = sec_info.get('callToAction', {}).get('url', '')
            
            # Extract category
            category_raw = section_to_cat.get(sec_id, 'Unknown')
            
            # Extract Image URL
            image_url = ""
            gallery = sec_info.get('mediaGallery', [])
            if gallery:
                img_info = gallery[0].get('image', {})
                img_id = img_info.get('id')
                if img_id:
                    # Construct probable mapme image URL. 
                    image_url = f"https://media.mapme.com/places/{sec_id}/gallery/{img_id}.hd"

                    
            if not name and not address:
                continue
                
            records.append({
                'church_name': str(name).strip(),
                'address': str(address).strip(),
                'city': '',
                'state': '',
                'country': '',
                'latitude': str(lat).strip(),
                'longitude': str(lng).strip(),
                'hours': str(desc).strip(),
                'category_raw': str(category_raw).strip(),
                'category_normalized': normalize_category(category_raw),
                'website': str(website).strip(),
                'phone': '',
                'email': '',
                'description': str(desc).strip(),
                'image_url': image_url,
                'source_url': 'https://www.latinmass.com/find-latin-mass',
                'scraped_at': scraped_at
            })
    except Exception as e:
        logger.error(f"Error parsing mapme payload: {e}")
        
    return records

def run_scraper():
    start_time = datetime.now()
    scraped_at = start_time.isoformat()
    
    captured_payloads = []
    
    def handle_response(response):
        try:
            # Skip images, fonts, stylesheets
            if response.request.resource_type in ["image", "font", "stylesheet", "media"]:
                return
                
            url = response.url.lower()
            if any(keyword in url for keyword in URL_KEYWORDS):
                content_type = response.headers.get("content-type", "").lower()
                # Focus on JSON, text, or CSV payloads
                if "application/json" in content_type or "text/" in content_type or "csv" in content_type:
                    body_text = response.text()
                    if body_text:
                        captured_payloads.append({
                            "url": response.url,
                            "content_type": content_type,
                            "body": body_text
                        })
                        logger.info(f"Captured potentially relevant payload from: {response.url}")
        except Exception as e:
            pass

    # Stage 1: Load page with Playwright and intercept network
    logger.info("Starting Playwright browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.on("response", handle_response)
        
        logger.info("Navigating to https://www.latinmass.com/find-latin-mass")
        try:
            page.goto("https://www.latinmass.com/find-latin-mass", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(5000)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(3000)
            page_content = page.content()
        except Exception as e:
            logger.error(f"Error loading page: {e}")
            page_content = ""
        finally:
            browser.close()
            
    # Save raw payloads
    output_dir = Path(".")
    raw_payloads_path = output_dir / "raw_network_payloads.json"
    with open(raw_payloads_path, "w", encoding="utf-8") as f:
        json.dump(captured_payloads, f, indent=2)
        
    logger.info(f"Captured {len(captured_payloads)} network payloads matching keywords. Saved to {raw_payloads_path.name}")
    
    final_records = {}
    candidate_records_generic = []
    
    # Process payloads
    for payload in captured_payloads:
        try:
            data = json.loads(payload["body"])
            
            # Check if this is the structured Mapme payload
            if isinstance(data, dict) and 'scene' in data and 'sections' in data['scene']:
                logger.info("Mapme API payload detected! Extracting detailed categories and images...")
                mapme_records = process_mapme_payload(data, scraped_at)
                for mapped in mapme_records:
                    key = f"{mapped['church_name']}_{mapped['address']}_{mapped['latitude']}_{mapped['longitude']}".lower()
                    if key not in final_records:
                        final_records[key] = mapped
            else:
                # Generic fallback for other random JSON found
                find_records(data, candidate_records_generic)
        except json.JSONDecodeError:
            pass
            
    # Check HTML for embedded data if generic fallback is needed
    if page_content and not final_records:
        patterns = [
            r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
            r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});',
            r'data-collection-items=["\'](\[.*?\])["\']',
            r'data-locations=["\'](\[.*?\])["\']'
        ]
        for pattern in patterns:
            matches = re.finditer(pattern, page_content, re.DOTALL)
            for match in matches:
                try:
                    data = json.loads(match.group(1).replace('&quot;', '"'))
                    find_records(data, candidate_records_generic)
                except json.JSONDecodeError:
                    pass
                    
    # Map generic records if they exist and we don't have Mapme records covering them
    for record in candidate_records_generic:
        mapped = map_record(record, scraped_at)
        if mapped:
            key = f"{mapped['church_name']}_{mapped['address']}_{mapped['latitude']}_{mapped['longitude']}".lower()
            # Only add if not already extracted via the superior Mapme parser
            if key not in final_records:
                final_records[key] = mapped
                
    final_list = list(final_records.values())
    logger.info(f"Final valid unique records: {len(final_list)}")
    
    # Output to CSV
    csv_path = output_dir / "latinmass_locations.csv"
    if final_list:
        df = pd.DataFrame(final_list, columns=CSV_COLUMNS)
        df.to_csv(csv_path, index=False, encoding="utf-8")
        logger.info(f"Saved location data to {csv_path.name}")
    else:
        logger.warning("No clear location records found. Generating diagnostic report.")
        generate_diagnostic_report(captured_payloads, page_content, output_dir)
        
    print("\n--- Summary ---")
    print(f"Network payloads captured: {len(captured_payloads)}")
    print(f"Final CSV rows saved: {len(final_list)}")
    print(f"Files saved in: {output_dir.absolute()}")

def find_records(data, records):
    """Recursively search JSON data for dictionaries that look like locations."""
    if isinstance(data, dict):
        keys_str = " ".join(data.keys()).lower()
        if any(k in keys_str for k in ['lat', 'lng', 'lon', 'address', 'latitude', 'longitude', 'church', 'parish']):
            records.append(data)
        for v in data.values():
            find_records(v, records)
    elif isinstance(data, list):
        for item in data:
            find_records(item, records)

def normalize_category(raw_category):
    if not raw_category:
        return "Unknown"
    
    cat_lower = str(raw_category).lower()
    if 'fssp' in cat_lower:
        return 'FSSP'
    elif 'sspx' in cat_lower or 'pius' in cat_lower:
        return 'SSPX'
    elif 'icksp' in cat_lower or 'institute' in cat_lower or 'roi souverain' in cat_lower:
        return 'ICKSP'
    elif 'diocesan' in cat_lower or 'diocese' in cat_lower or 'parish' in cat_lower:
        return 'Diocesan'
    elif 'school' in cat_lower:
        return 'School'
    elif 'college' in cat_lower or 'university' in cat_lower:
        return 'College'
    elif 'independent' in cat_lower:
        return 'Independent'
    else:
        return 'Other'

def map_record(record, scraped_at):
    """Fallback function to attempt to extract standard fields from a generic raw record dict."""
    r_lower = {str(k).lower(): v for k, v in record.items()}
    
    lat = r_lower.get('lat') or r_lower.get('latitude') or ''
    lng = r_lower.get('lng') or r_lower.get('lon') or r_lower.get('longitude') or ''
    
    if not lat or not lng:
        if 'geometry' in r_lower and isinstance(r_lower['geometry'], dict):
            coords = r_lower['geometry'].get('coordinates', [])
            if len(coords) >= 2:
                lng, lat = coords[0], coords[1]
                
    address = r_lower.get('address') or r_lower.get('street') or r_lower.get('location') or ''
    if not lat and not lng and not address:
        return None
        
    name = r_lower.get('name') or r_lower.get('title') or r_lower.get('church') or r_lower.get('parish') or ''
    city = r_lower.get('city') or ''
    state = r_lower.get('state') or r_lower.get('province') or ''
    country = r_lower.get('country') or ''
    website = r_lower.get('website') or r_lower.get('url') or r_lower.get('link') or ''
    phone = r_lower.get('phone') or r_lower.get('telephone') or ''
    email = r_lower.get('email') or ''
    raw_cat = r_lower.get('category') or r_lower.get('type') or r_lower.get('affiliation') or ''
    
    desc = str(r_lower.get('description') or r_lower.get('notes') or '')
    hours = str(r_lower.get('mass_times') or r_lower.get('masstimes') or r_lower.get('schedule') or desc or '')
    
    if not name and not address:
        return None
        
    return {
        'church_name': str(name).strip(),
        'address': str(address).strip(),
        'city': str(city).strip(),
        'state': str(state).strip(),
        'country': str(country).strip(),
        'latitude': str(lat).strip(),
        'longitude': str(lng).strip(),
        'hours': hours.strip(),
        'category_raw': str(raw_cat).strip(),
        'category_normalized': normalize_category(raw_cat),
        'website': str(website).strip(),
        'phone': str(phone).strip(),
        'email': str(email).strip(),
        'description': desc.strip(),
        'image_url': '',
        'source_url': 'https://www.latinmass.com/find-latin-mass',
        'scraped_at': scraped_at
    }

def generate_diagnostic_report(payloads, html, output_dir):
    report_lines = []
    report_lines.append("=== Diagnostic Report ===")
    report_lines.append(f"Network payloads captured: {len(payloads)}")
    for p in payloads:
        report_lines.append(f"- URL: {p['url']} (Type: {p['content_type']})")
        
    html_lower = html.lower()
    report_lines.append("\n=== HTML Analysis ===")
    if "mapboxgl" in html_lower or "mapbox" in html_lower:
        report_lines.append("Mapbox detected in HTML.")
    if "webflow" in html_lower:
        report_lines.append("Webflow CMS detected in HTML.")
        
    report_path = output_dir / "diagnostic_report.txt"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
    logger.info(f"Saved diagnostic report to {report_path.name}")

if __name__ == "__main__":
    run_scraper()
