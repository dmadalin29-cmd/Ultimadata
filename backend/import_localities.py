import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "x67digital")

# All Romanian counties with coordinates
JUDETE = [
    {"code": "AB", "name": "Alba", "lat": 46.0667, "lng": 23.5833},
    {"code": "AR", "name": "Arad", "lat": 46.1667, "lng": 21.3167},
    {"code": "AG", "name": "Argeș", "lat": 44.8564, "lng": 24.8692},
    {"code": "BC", "name": "Bacău", "lat": 46.5670, "lng": 26.9146},
    {"code": "BH", "name": "Bihor", "lat": 47.0458, "lng": 21.9183},
    {"code": "BN", "name": "Bistrița-Năsăud", "lat": 47.1333, "lng": 24.5000},
    {"code": "BT", "name": "Botoșani", "lat": 47.7500, "lng": 26.6667},
    {"code": "BR", "name": "Brăila", "lat": 45.2692, "lng": 27.9575},
    {"code": "BV", "name": "Brașov", "lat": 45.6556, "lng": 25.6108},
    {"code": "B", "name": "București", "lat": 44.4268, "lng": 26.1025},
    {"code": "BZ", "name": "Buzău", "lat": 45.1500, "lng": 26.8333},
    {"code": "CL", "name": "Călărași", "lat": 44.2000, "lng": 27.3333},
    {"code": "CS", "name": "Caraș-Severin", "lat": 45.3000, "lng": 21.9000},
    {"code": "CJ", "name": "Cluj", "lat": 46.7833, "lng": 23.5500},
    {"code": "CT", "name": "Constanța", "lat": 44.1598, "lng": 28.6348},
    {"code": "CV", "name": "Covasna", "lat": 45.8500, "lng": 26.1833},
    {"code": "DB", "name": "Dâmbovița", "lat": 44.9333, "lng": 25.4500},
    {"code": "DJ", "name": "Dolj", "lat": 44.3167, "lng": 23.8000},
    {"code": "GL", "name": "Galați", "lat": 45.4353, "lng": 28.0080},
    {"code": "GR", "name": "Giurgiu", "lat": 43.9037, "lng": 25.9699},
    {"code": "GJ", "name": "Gorj", "lat": 45.0500, "lng": 23.2833},
    {"code": "HR", "name": "Harghita", "lat": 46.3500, "lng": 25.8000},
    {"code": "HD", "name": "Hunedoara", "lat": 45.7500, "lng": 22.9000},
    {"code": "IL", "name": "Ialomița", "lat": 44.5667, "lng": 27.3667},
    {"code": "IS", "name": "Iași", "lat": 47.1585, "lng": 27.6014},
    {"code": "IF", "name": "Ilfov", "lat": 44.5000, "lng": 26.0833},
    {"code": "MM", "name": "Maramureș", "lat": 47.6500, "lng": 23.5833},
    {"code": "MH", "name": "Mehedinți", "lat": 44.6333, "lng": 22.6500},
    {"code": "MS", "name": "Mureș", "lat": 46.5500, "lng": 24.5667},
    {"code": "NT", "name": "Neamț", "lat": 46.9333, "lng": 26.3667},
    {"code": "OT", "name": "Olt", "lat": 44.4333, "lng": 24.3667},
    {"code": "PH", "name": "Prahova", "lat": 44.9500, "lng": 26.0167},
    {"code": "SJ", "name": "Sălaj", "lat": 47.2000, "lng": 23.0500},
    {"code": "SM", "name": "Satu Mare", "lat": 47.7833, "lng": 22.8833},
    {"code": "SB", "name": "Sibiu", "lat": 45.8000, "lng": 24.1500},
    {"code": "SV", "name": "Suceava", "lat": 47.6333, "lng": 26.2500},
    {"code": "TR", "name": "Teleorman", "lat": 43.9833, "lng": 25.3333},
    {"code": "TM", "name": "Timiș", "lat": 45.7500, "lng": 21.2333},
    {"code": "TL", "name": "Tulcea", "lat": 45.1667, "lng": 28.8000},
    {"code": "VL", "name": "Vâlcea", "lat": 45.1000, "lng": 24.3667},
    {"code": "VS", "name": "Vaslui", "lat": 46.6333, "lng": 27.7333},
    {"code": "VN", "name": "Vrancea", "lat": 45.8333, "lng": 27.0667}
]

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear and insert counties
    await db.judete.delete_many({})
    await db.judete.insert_many(JUDETE)
    print(f"Inserted {len(JUDETE)} judete")
    
    # Create index
    await db.judete.create_index("code", unique=True)
    await db.judete.create_index("name")
    
    client.close()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
