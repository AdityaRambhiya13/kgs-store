import urllib.request
import urllib.error
import json

# Login as admin
req1 = urllib.request.Request(
    'http://localhost:8000/api/auth/admin-login',
    data=json.dumps({'password': 'admin'}).encode(), # default password? Wait, let's check .env
    headers={'Content-Type': 'application/json'}
)
try:
    res = urllib.request.urlopen(req1)
    token = json.loads(res.read().decode())['access_token']

    # Fetch orders
    req2 = urllib.request.Request(
        'http://localhost:8000/api/orders',
        headers={'Authorization': f'Bearer {token}'}
    )
    res2 = urllib.request.urlopen(req2)
    print("Success, orders count:", len(json.loads(res2.read().decode())))
except urllib.error.HTTPError as e:
    print('Error:', e.code, e.read().decode())
