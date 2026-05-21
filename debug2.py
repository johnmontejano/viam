import json

with open('raw_network_payloads.json', 'r') as f:
    payloads = json.load(f)

output = []

for p in payloads:
    if 'categories' in p['body'] and 'sections' in p['body']:
        data = json.loads(p['body'])
        if 'scene' in data and 'sections' in data['scene']:
            first_section_id = list(data['scene']['sections'].keys())[0]
            output.append("SECTION:")
            output.append(json.dumps(data['scene']['sections'][first_section_id], indent=2))
            
            # Print categories map
            cats = data['scene'].get('categories', {})
            output.append("CATEGORIES:")
            for cid, cdata in list(cats.items()):
                output.append(f"{cid}: {cdata.get('name')}")
            
            # Also find section '110 State Street'
            for sid, sdata in data['scene']['sections'].items():
                if '110 State Street' in json.dumps(sdata):
                    output.append("FOUND 110 STATE STREET SECTION:")
                    output.append(json.dumps(sdata, indent=2))
                    break
            
            break

with open('debug_output.txt', 'w') as f:
    f.write("\n".join(output))
