from fastapi import APIRouter, HTTPException
from boto3 import client
from typing import List, Optional
import os
router = APIRouter()

# Configure S3 client for Cloudflare R2
s3_client = client(
    "s3",
    region_name="auto",
    endpoint_url=os.getenv("R2_ENDPOINT", "https://aa2f6aae69e7fb4bd8e2cd4311c411cb.r2.cloudflarestorage.com"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID","8b5a4a988c474205e0172eab5479d6f2")
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY","8ff719bbf2946c1b6a81fcf2121e1a41604a0b6f2890f308871b381e98a8d725")
)

@router.get("/s3/list", tags=["s3"])
async def list_s3_objects(prefix: str = "", page: int = 1, page_size: int = 10):
    try:
        response = s3_client.list_objects_v2(
            Bucket="iconluxurygroup",
            Prefix=prefix,
            Delimiter="/",
            MaxKeys=page_size,
            StartAfter=f"{prefix}{(page - 1) * page_size}" if page > 1 else ""
        )
        folders = [
            {
                "type": "folder",
                "name": prefix["Prefix"].rstrip("/").split("/")[-1],
                "path": prefix["Prefix"]
            }
            for prefix in response.get("CommonPrefixes", [])
        ]
        files = [
            {
                "type": "file",
                "name": obj["Key"].replace(prefix, "", 1),
                "path": obj["Key"],
                "size": obj["Size"],
                "lastModified": obj["LastModified"].isoformat()
            }
            for obj in response.get("Contents", [])
            if obj["Key"] != prefix and not obj["Key"].endswith("/")
        ]
        return folders + files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))