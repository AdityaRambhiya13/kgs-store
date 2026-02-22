import urllib.request
import urllib.error

req = urllib.request.Request('http://localhost:8000/api/products')
try:
    res = urllib.request.urlopen(req)
    print("Products Success:", len(res.read()))
except urllib.error.HTTPError as e:
    print('Products Err', e.code, e.read().decode())
