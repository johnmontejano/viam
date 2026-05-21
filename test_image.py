import urllib.request

image_id = "16f22cdc-0101-46f7-929a-7a4fa603b9f3"
urls_to_test = [
    f"https://media.mapme.com/images/{image_id}",
    f"https://images.mapme.com/{image_id}",
    f"https://storage.googleapis.com/mapme-images/{image_id}",
    f"https://cdn.mapme.com/images/{image_id}",
    f"https://static-resources.mapme.com/images/{image_id}",
    f"https://cdn.mapme.com/media/{image_id}",
    f"https://media.mapme.com/mapme-images/{image_id}/large"
]

output = []
for url in urls_to_test:
    try:
        req = urllib.request.Request(url, method="HEAD")
        resp = urllib.request.urlopen(req)
        if resp.status == 200:
            output.append(f"SUCCESS: {url}")
            break
    except Exception as e:
        output.append(f"FAILED: {url} - {e}")

with open('image_test_output.txt', 'w') as f:
    f.write("\n".join(output))
