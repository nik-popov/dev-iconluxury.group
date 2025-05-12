from fastapi import APIRouter, HTTPException
from boto3 import client
from typing import Optional
import os
import logging
from botocore.exceptions import ClientError

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
    """
    try:
        count = 0
        continuation_token = None
        while True:
            params = {
                "Bucket": "iconluxurygroup",
                "Prefix": prefix,
                "MaxKeys": 1000,
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
        return 0

@router.get("/s3/list", tags=["s3"])
async def list_s3_objects(prefix: str = "", page: int = 1, page_size: int = 10, continuation_token: Optional[str] = None):
    """
    List S3 objects and folders with pagination.
    Args:
        prefix: S3 prefix to filter objects.
        page: Page number (1-based).
        page_size: Number of items per page.
        continuation_token: S3 continuation token for pagination (optional).
    Returns:
        A JSON object with objects, pagination metadata, and hasMore flag.
    """
    try:
        if page < 1 or page_size < 1:
            raise HTTPException(status_code=400, detail="Invalid page or page_size")

        # Prepare parameters for S3 request
        params = {
            "Bucket": "iconluxurygroup",
            "Prefix": prefix,
            "Delimiter": "/",
            "MaxKeys": page_size,
        }
        if page > 1 and continuation_token:
            params["ContinuationToken"] = continuation_token

        # List objects
        response = s3_client.list_objects_v2(**params)

        # Process folders
        folders = []
        for common_prefix in response.get("CommonPrefixes", []):
            folder_path = common_prefix["Prefix"]
            folder_name = folder_path.rstrip("/").split("/")[-1]
            if folder_name:
                count = await get_folder_count(folder_path)
                folders.append({
                    "type": "folder",
                    "name": folder_name,
                    "path": folder_path,
                    "count": count,
                    "lastModified": None
                })

        # Process files
        files = []
        for obj in response.get("Contents", []):
            key = obj["Key"]
            if key != prefix and not key.endswith("/"):
                file_name = key.replace(prefix, "", 1).lstrip("/")
                if file_name:
                    files.append({
                        "type": "file",
                        "name": file_name,
                        "path": key,
                        "size": obj["Size"],
                        "lastModified": obj["LastModified"].isoformat(),
                        "count": None
                    })

        # Combine results
        objects = folders + files

        # Pagination metadata
        has_more = response.get("IsTruncated", False)
        next_continuation_token = response.get("NextContinuationToken")

        return {
            "objects": objects,
            "hasMore": has_more,
            "nextContinuationToken": next_continuation_token,
            "totalItems": len(objects),
            "page": page,
            "pageSize": page_size
        }

    except s3_client.exceptions.NoSuchBucket as e:
        logger.error(f"Bucket not found: {str(e)}")
        raise HTTPException(status_code=404, detail="S3 bucket not found")
    except s3_client.exceptions.ClientError as e:
        logger.error(f"S3 client error: {str(e)}")
        error_code = e.response.get("Error", {}).get("Code")
        if error_code == "InvalidToken":
            raise HTTPException(status_code=400, detail="Invalid continuation token")
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/s3/sign", tags=["s3"])
async def get_signed_url(key: str, expires_in: int = 3600):
    """
    Generate a signed URL for an S3 object.
    """
    try:
        if not key:
            raise HTTPException(status_code=400, detail="Object key is required")
        if expires_in < 1 or expires_in > 604800:
            raise HTTPException(status_code=400, detail="expires_in must be between 1 and 604800 seconds")

        signed_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": "iconluxurygroup",
                "Key": key
            },
            ExpiresIn=expires_in
        )
        return {"signedUrl": signed_url}
    except ClientError as e:
        logger.error(f"Error generating signed URL for key {key}: {str(e)}")
        error_code = e.response.get("Error", {}).get("Code")
        if error_code == "NoSuchKey":
            raise HTTPException(status_code=404, detail="Object not found")
        elif error_code == "AccessDenied":
            raise HTTPException(status_code=403, detail="Access denied to the object")
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error generating signed URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")