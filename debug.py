import json

with open('raw_network_payloads.json', 'r') as f:
    payloads = json.load(f)

for p in payloads:
    if 'categories' in p['body'] and 'sections' in p['body']:
        data = json.loads(p['body'])
        if 'scene' in data and 'sections' in data['scene']:
            first_section_id = list(data['scene']['sections'].keys())[0]
            print("SECTION:")
            print(json.dumps(data['scene']['sections'][first_section_id], indent=2))
            
            # Print categories map
            cats = data['scene'].get('categories', {})
            print("CATEGORIES:")
            for cid, cdata in list(cats.items())[:5]:
                print(f"{cid}: {cdata.get('name')}")
            break
