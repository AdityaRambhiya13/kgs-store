from pyzbar.pyzbar import decode
from PIL import Image
import os

qr_path = r"c:\Users\adity\OneDrive\Desktop\KGS\kgs qr.jpeg"

if not os.path.exists(qr_path):
    print(f"File not found: {qr_path}")
else:
    try:
        data = decode(Image.open(qr_path))
        if not data:
            print("No QR code found in the image.")
        for obj in data:
            print(f"Decoded Data: {obj.data.decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")
