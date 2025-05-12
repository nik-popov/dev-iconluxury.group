from fastapi import APIRouter, HTTPException
from boto3 import client
from typing import List, Optional
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Configure S3 client for Cloudflare R2
s3_client = client(
    "s3",
    region_name="auto",
    endpoint_url=os.getenv("R2_ENDPOINT", "https://aa2f6aae69e7fb4bd8e2cd4311c411cb.r2.cloudflarestorage.com"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID", "8b5a4a988c474205e0172eab5479d6f2"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY", "8ff719bbf2946c1b6a81fcf2121e1a41604a0b6f2890f308871b381e98a8d725")
)

async def get_folder_count(prefix: str) -> int:
    """
    Count the number of objects in a folder (prefix) by listing all objects.
    Note: This can be slow for large folders; consider caching or backend optimization.
    """
    try:
        count = 0
        continuation_token = None
        while True:
            params = {
                "Bucket": "iconluxurygroup",
                "Prefix": prefix,
                "MaxKeys": 1000,  # Adjust based on performance needs
            }
            if continuation_token:
                params["ContinuationToken"] = continuation_token
            response = s3_client.list_objects_v2(**params)
            count += len(response.get("Contents", []))
            continuation_token = response.get("NextContinuationToken")
            if not continuation_token:
                break
        return count
    except Exception as e:
        logger.error(f"Error counting objects in folder {prefix}: {str(e)}")
        return 0  # Fallback to 0 if counting fails

@router.get("/s3/list", tags=["s3"])
async def list_s3_objects(prefix: str = "", page: int = 1, page_size: int = 10):
    try:
        if page < 1 or page_size < 1:
            raise HTTPException(status_code=400, detail="Invalid page or page_size")

        # List objects with pagination
        response = s3_client.list_objects_v2(
            Bucket="iconluxurygroup",
            Prefix=prefix,
            Delimiter="/",
            MaxKeys=page_size,
            ContinuationToken=None if page == 1 else await get_continuation_token(prefix, page, page_size)
        )

        # Process folders
        folders = []
        for common_prefix in response.get("CommonPrefixes", []):
            folder_path = common_prefix["Prefix"]
            folder_name = folder_path.rstrip("/").split("/")[-1]
            if folder_name:  # Skip empty folder names
                count = await get_folder_count(folder_path)
                folders.append({
                    "type": "folder",
                    "name": folder_name,
                    "path": folder_path,
                    "count": count,
                    "lastModified": None  # Folders typically don't have a LastModified date in S3
                })

        # Process files
        files = []
        for obj in response.get("Contents", []):
            key = obj["Key"]
            if key != prefix and not key.endswith("/"):  # Exclude folder keys and prefix itself
                file_name = key.replace(prefix, "", 1).lstrip("/")
                if file_name:  # Skip empty file names
                    files.append({
                        "type": "file",
                        "name": file_name,
                        "path": key,
                        "size": obj["Size"],
                        "lastModified": obj["LastModified"].isoformat(),
                        "count": None  # Files don't have counts
                    })

        # Combine results
        objects = folders + files

        # Determine if more pages are available
        has_more = response.get("IsTruncated", False)

        # Return response with metadata
        return {
            "objects": objects,
            "hasMore": has_more,
            "totalItems": len(objects),
            "page": page,
            "pageSize": page_size
        }

    except s3_client.exceptions.NoSuchBucket as e:
        logger.error(f"Bucket not found: {str(e)}")
        raise HTTPException(status_code=404, detail="S3 bucket not found")
    except s3_client.exceptions.ClientError as e:
        logger.error(f"S3 client error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def get_continuation_token(prefix: str, page: int, page_size: int) -> Optional[str]:
    """
    Fetch the continuation token for the given page by simulating previous page requests.
    Note: This is a workaround; ideally, store tokens or use a more efficient pagination method.
    """
    try:
        if page <= 1:
            return None
        continuation_token = None
        for p in range(1, page):
            response = s3_client.list_objects_v2(
                Bucket="iconluxurygroup",
                Prefix=prefix,
                Delimiter="/",
                MaxKeys=page_size
            )
            continuation_token = response.get("NextContinuationToken")
            if not continuation_token:
                break
        return continuation_token
    except Exception as e:
        logger.error(f"Error fetching continuation token: {str(e)}")
        return None