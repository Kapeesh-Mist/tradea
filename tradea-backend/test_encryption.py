import os
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64
import json
from dotenv import load_dotenv

load_dotenv()

def encrypt_payload(data: dict) -> str:
    key = os.getenv("ENCRYPTION_KEY").encode()
    print(f"Key length: {len(key)}")
    iv = get_random_bytes(16)
    cipher = AES.new(key, AES.MODE_CFB, iv)
    encrypted = cipher.encrypt(json.dumps(data).encode())
    return base64.b64encode(iv + encrypted).decode()

try:
    payload = {"test": "data"}
    encrypted = encrypt_payload(payload)
    print(f"Encryption successful: {encrypted}")
except Exception as e:
    print(f"Encryption failed: {e}")
