from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from boto3 import client
from typing import Optional, List
import os
import logging
from botocore.exceptions import ClientError
from fastapi import Query
from pydantic import BaseModel
import re
import csv
from io import StringIO
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure routers for S3 and R2
s3_router = APIRouter(prefix="/s3", tags=["s3"])
r2_router = APIRouter(prefix="/r2", tags=["r2"])

# Configure S3 client (used for both S3 and R2)
s3_client = client(
    "s3",
    region_name="auto",
    endpoint_url=os.getenv("R2_ENDPOINT", "https://97d91ece470eb7b9aa71ca0c781cfacc.r2.cloudflarestorage.com"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID", "5547ff7ffb8f3b16a15d6f38322cd8bd"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY", "771014b01093eceb212dfea5eec0673842ca4a39456575ca7ff43f768cf42978")
)

# Constants
BUCKET_NAME = "iconluxurygroup"
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB

# Pydantic model for delete request
class DeleteRequest(BaseModel):
    paths: List[str]

async def get_folder_count(prefix: str) -> int:
    """
    Count the number of objects in a folder (prefix) by listing all objects.
    """
    try:
        count = 0
        continuation_token = None
        while True:
            params = {
                "Bucket": BUCKET_NAME,
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

def sanitize_path(path: str) -> str:
    """Sanitize the path to prevent directory traversal and invalid characters."""
    clean_path = os.path.normpath(path.lstrip("/")).replace("\\", "/")
    if clean_path.startswith("..") or "/.." in clean_path:
        raise ValueError("Invalid path: contains parent directory references")
    return clean_path

async def list_objects(prefix: str = "", page: int = 1, page_size: int = 10, continuation_token: Optional[str] = None):
    """
    List objects and folders with pagination.
    """
    try:
        if page < 1 or page_size < 1:
            raise HTTPException(status_code=400, detail="Invalid page or page_size")

        params = {
            "Bucket": BUCKET_NAME,
            "Prefix": prefix,
            "Delimiter": "/",
            "MaxKeys": page_size,
        }
        if page > 1 and continuation_token:
            params["ContinuationToken"] = continuation_token

        response = s3_client.list_objects_v2(**params)

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

        objects = folders + files
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
        raise HTTPException(status_code=404, detail="Bucket not found")
    except s3_client.exceptions.ClientError as e:
        logger.error(f"Client error: {str(e)}")
        error_code = e.response.get("Error", {}).get("Code")
        if error_code == "InvalidToken":
            raise HTTPException(status_code=400, detail="Invalid continuation token")
        raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def get_signed_url(key: str, expires_in: int = 3600):
    """
    Generate a signed URL for an object.
    """
    try:
        if not key:
            raise HTTPException(status_code=400, detail="Object key is required")
        if expires_in < 1 or expires_in > 604800:
            raise HTTPException(status_code=400, detail="expires_in must be between 1 and 604800 seconds")

        signed_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": BUCKET_NAME,
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
        raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error generating signed URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def upload_file(file: UploadFile, path: str):
    """
    Upload a file to S3 with robust error handling and validation.
    """
    try:
        if not file.filename:
            logger.error("No filename provided for upload")
            raise HTTPException(status_code=400, detail="No filename provided")
            
        if not path:
            logger.error("No destination path provided")
            raise HTTPException(status_code=400, detail="No destination path provided")
            
        MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
        file_size = 0
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        if file_size > MAX_FILE_SIZE:
            logger.error(f"File size {file_size} exceeds maximum {MAX_FILE_SIZE}")
            raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE} bytes")
        if file_size == 0:
            logger.error("Empty file provided")
            raise HTTPException(status_code=400, detail="Empty file provided")
            
        sanitized_path = sanitize_path(path)
        
        content_type = file.content_type
        if not content_type or content_type == "application/octet-stream":
            content_type, _ = mimetypes.guess_type(file.filename)
            content_type = content_type or "application/octet-stream"
        
        extra_args = {
            "ContentType": content_type,
            "Metadata": {
                "original_filename": file.filename,
                "upload_timestamp": str(int(os.times().elapsed))
            }
        }
        
        logger.info(f"Uploading file {file.filename} to s3://{BUCKET_NAME}/{sanitized_path}")
        
        response = s3_client.upload_fileobj(
            Fileobj=file.file,
            Bucket=BUCKET_NAME,
            Key=sanitized_path,
            ExtraArgs=extra_args
        )
        
        try:
            s3_client.head_object(Bucket=BUCKET_NAME, Key=sanitized_path)
        except ClientError as e:
            logger.error(f"Verification failed for {sanitized_path}: {str(e)}")
            raise HTTPException(status_code=500, detail="Upload verification failed")
            
        logger.info(f"Successfully uploaded {file.filename} to {sanitized_path}")
        return {
            "message": f"File uploaded successfully to {sanitized_path}",
            "filename": file.filename,
            "content_type": content_type,
            "size": file_size
        }
        
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_message = e.response.get("Error", {}).get("Message", str(e))
        logger.error(f"S3 error uploading to {path}: {error_code} - {error_message}")
        if error_code == "NoSuchBucket":
            raise HTTPException(status_code=500, detail="Storage bucket does not exist")
        elif error_code in ("AccessDenied", "Forbidden"):
            raise HTTPException(status_code=403, detail="Insufficient permissions to upload file")
        else:
            raise HTTPException(status_code=500, detail=f"Storage error: {error_message}")
            
    except ValueError as e:
        logger.error(f"Path validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid path: {str(e)}")
        
    except Exception as e:
        logger.error(f"Unexpected error uploading file to {path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def delete_objects(paths: List[str]):
    try:
        if not paths:
            raise HTTPException(status_code=400, detail="No paths provided")
        sanitized_paths = [sanitize_path(path) for path in paths]
        objects_to_delete = []
        for path in sanitized_paths:
            if path.endswith("/"):
                continuation_token = None
                while True:
                    response = s3_client.list_objects_v2(
                        Bucket=BUCKET_NAME,
                        Prefix=path,
                        MaxKeys=1000,
                        ContinuationToken=continuation_token
                    )
                    for obj in response.get("Contents", []):
                        objects_to_delete.append({"Key": obj["Key"]})
                    continuation_token = response.get("NextContinuationToken")
                    if not continuation_token:
                        break
            else:
                objects_to_delete.append({"Key": path})
        if not objects_to_delete:
            return {"message": "No objects to delete"}
        response = s3_client.delete_objects(
            Bucket=BUCKET_NAME,
            Delete={"Objects": objects_to_delete, "Quiet": True}
        )
        errors = response.get("Errors", [])
        if errors:
            error_details = ", ".join([f"{err['Key']}: {err['Message']}" for err in errors])
            raise HTTPException(status_code=500, detail=f"Failed to delete some objects: {error_details}")
        return {"message": f"Successfully deleted {len(objects_to_delete)} objects"}
    except ClientError as e:
        logger.error(f"Error deleting objects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")

async def export_to_csv(prefix: str = ""):
    """
    Export object list to CSV.
    """
    try:
        # Fetch all objects
        objects = []
        continuation_token = None
        while True:
            params = {
                "Bucket": BUCKET_NAME,
                "Prefix": prefix,
                "Delimiter": "/",
                "MaxKeys": 1000,
            }
            if continuation_token:
                params["ContinuationToken"] = continuation_token
            response = s3_client.list_objects_v2(**params)

            # Process folders
            for common_prefix in response.get("CommonPrefixes", []):
                folder_path = common_prefix["Prefix"]
                folder_name = folder_path.rstrip("/").split("/")[-1]
                if folder_name:
                    count = await get_folder_count(folder_path)
                    objects.append({
                        "type": "folder",
                        "name": folder_name,
                        "path": folder_path,
                        "size": None,
                        "lastModified": None,
                        "count": count
                    })

            # Process files
            for obj in response.get("Contents", []):
                key = obj["Key"]
                if key != prefix and not key.endswith("/"):
                    file_name = key.replace(prefix, "", 1).lstrip("/")
                    if file_name:
                        objects.append({
                            "type": "file",
                            "name": file_name,
                            "path": key,
                            "size": obj["Size"],
                            "lastModified": obj["LastModified"].isoformat(),
                            "count": None
                        })

            continuation_token = response.get("NextContinuationToken")
            if not continuation_token:
                break

        # Create CSV
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=["type", "name", "path", "size", "lastModified", "count"])
        writer.writeheader()
        for obj in objects:
            writer.writerow({
                "type": obj["type"],
                "name": obj["name"],
                "path": obj["path"],
                "size": obj["size"] if obj["size"] is not None else "",
                "lastModified": obj["lastModified"] if obj["lastModified"] is not None else "",
                "count": obj["count"] if obj["count"] is not None else ""
            })

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=file_list_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
        )

    except s3_client.exceptions.NoSuchBucket as e:
        logger.error(f"Bucket not found: {str(e)}")
        raise HTTPException(status_code=404, detail="Bucket not found")
    except s3_client.exceptions.ClientError as e:
        logger.error(f"Client error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error exporting CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# S3 Endpoints
@s3_router.get("/list")
async def s3_list_objects(
    prefix: str = "",
    page: int = 1,
    page_size: int = 10,
    continuation_token: Optional[str] = None
):
    return await list_objects(prefix, page, page_size, continuation_token)

@s3_router.get("/sign")
async def s3_get_signed_url(key: str, expires_in: int = 3600):
    return await get_signed_url(key, expires_in)

@s3_router.post("/upload")
async def s3_upload_file(
    file: UploadFile = File(...),
    path: str = Query(...)
):
    return await upload_file(file, path)

@s3_router.post("/delete")
async def s3_delete_objects(request: DeleteRequest):
    return await delete_objects(request.paths)

@s3_router.get("/export-csv")
async def s3_export_to_csv(prefix: str = ""):
    return await export_to_csv(prefix)

# R2 Endpoints
@r2_router.get("/list")
async def r2_list_objects(
    prefix: str = "",
    page: int = 1,
    page_size: int = 10,
    continuation_token: Optional[str] = None
):
    return await list_objects(prefix, page, page_size, continuation_token)

@r2_router.get("/sign")
async def r2_get_signed_url(key: str, expires_in: int = 3600):
    return await get_signed_url(key, expires_in)

@r2_router.post("/upload")
async def r2_upload_file(
    file: UploadFile = File(...),
    path: str = Depends(lambda x: x.query_params.get("path"))
):
    return await upload_file(file, path)

@r2_router.post("/delete")
async def r2_delete_objects(request: DeleteRequest):
    return await delete_objects(request.paths)

@r2_router.get("/export-csv")
async def r2_export_to_csv(prefix: str = ""):
    return await export_to_csv(prefix)