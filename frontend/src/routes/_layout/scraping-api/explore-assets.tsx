import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  Divider,
  Flex,
  Input,
  Select,
  useToast,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  IconButton,
  HStack,
} from "@chakra-ui/react";
import { FiFolder, FiFile, FiDownload, FiChevronRight, FiChevronDown, FiArrowUp, FiArrowDown } from "react-icons/fi";
import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFile } from "react-icons/fa";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_BUCKET = process.env.REACT_APP_R2_BUCKET || "iconluxurygroup";
const REGION = "auto";
const ENDPOINT = process.env.REACT_APP_R2_ENDPOINT || "https://iconluxury.group";

const s3Client = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.REACT_APP_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.REACT_APP_R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

interface S3Object {
  type: "folder" | "file";
  name: string;
  path: string;
  size?: number;
  lastModified?: Date;
}

async function listS3Objects(prefix: string, page: number, pageSize = 10): Promise<S3Object[]> {
  try {
    const response = await fetch(
      `https://api.iconluxury.group/api/v1/s3/list?prefix=${encodeURIComponent(prefix)}&page=${page}&pageSize=${pageSize}`
    );
    if (!response.ok) {
      throw new Error(`Failed to list objects: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((item: any) => ({
      ...item,
      lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
    }));
  } catch (error: any) {
    console.error("Error fetching S3 objects:", error);
    const message = error.message?.includes("CORS")
      ? "CORS error: Ensure the FastAPI server is configured to allow requests from https://dashboard.iconluxury.group."
      : `Failed to list objects: ${error.message || "Unknown error"}`;
    throw new Error(message);
  }
}

async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// File type icon mapping based on extension
// File type icon mapping based on extension
const getFileIcon = (name: string) => {
  const extension = (name.split(".").pop()?.toLowerCase() || "");
  switch (extension) {
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return <FaFileImage />;
    case "pdf":
      return <FaFilePdf />;
    case "doc":
    case "docx":
      return <FaFileWord />;
    case "xls":
    case "xlsx":
      return <FaFileExcel />;
    default:
      return <FiFile />;
  }
};

// Determine file type for preview
const getFileType = (name: string) => {
  const extension = (name.split(".").pop()?.toLowerCase() || "");
  if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
  if (["txt", "json", "md"].includes(extension)) return "text";
  if (extension === "pdf") return "pdf";
  return "unsupported";
};
export const Route = createFileRoute("/_layout/scraping-api/explore-assets")({
  component: FileExplorer,
});

function FileExplorer() {
  const toast = useToast();
  const [currentPath, setCurrentPath] = useState("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "file">("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<"name" | "size" | "lastModified">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  const { data: s3Objects, isFetching, error: s3Error } = useQuery<S3Object[], Error>({
    queryKey: ["s3Objects", currentPath, page],
    queryFn: () => listS3Objects(currentPath, page),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (s3Objects) {
      setObjects((prev) => (page === 1 ? s3Objects : [...prev, ...s3Objects]));
    }
  }, [s3Objects, page]);

  // Handle folder click (navigate or toggle expansion)
  const handleFolderClick = (path: string) => {
    if (expandedFolders.includes(path)) {
      setExpandedFolders(expandedFolders.filter((p) => p !== path));
    } else {
      setExpandedFolders([...expandedFolders, path]);
      setCurrentPath(path);
      setPage(1);
    }
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
    setObjects([]);
    setPage(1);
    setExpandedFolders(expandedFolders.filter((p) => !p.startsWith(path) || p === path));
  };

  // Handle going back to parent directory
  const handleGoBack = () => {
    const parentPath = currentPath.split("/").slice(0, -2).join("/") + "/";
    setCurrentPath(parentPath);
    setObjects([]);
    setPage(1);
    setExpandedFolders(expandedFolders.filter((p) => !p.startsWith(parentPath) || p === parentPath));
  };

  // Handle file download
  const handleDownload = async (key: string) => {
    try {
      const url = await getDownloadUrl(key);
      window.open(url, "_blank");
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Unable to generate download URL",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle load more for pagination
  const handleLoadMore = () => setPage((prev) => prev + 1);

  // Handle sorting
  const handleSort = (field: "name" | "size" | "lastModified") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Generate breadcrumbs
  const breadcrumbs = () => {
    const parts = currentPath.split("/").filter((p) => p);
    const crumbs = [
      { name: "Home", path: "" },
      ...parts.map((part, index) => ({
        name: part,
        path: parts.slice(0, index + 1).join("/") + "/",
      })),
    ];
    return crumbs;
  };

  // Filter and sort objects
  const filteredObjects = objects
    .filter((obj) => {
      const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || obj.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "size") {
        comparison = (a.size || 0) - (b.size || 0);
      } else if (sortField === "lastModified") {
        comparison = (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  if (s3Error) {
    return (
      <Container maxW="full" bg="white" color="gray.800" py={6}>
        <Text color="red.500">{s3Error.message}</Text>
      </Container>
    );
  }

  return (
    <Container maxW="full" bg="white" color="gray.800" py={6}>
      {/* Header */}
      <Flex align="center" justify="space-between" flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">
            File Explorer
          </Text>
          <Text fontSize="sm" color="gray.600">
            Browse and download files from S3 storage
          </Text>
        </Box>
        {currentPath && (
          <Button size="sm" variant="outline" colorScheme="green" onClick={handleGoBack}>
            Back
          </Button>
        )}
      </Flex>

      {/* Breadcrumbs */}
      <Box my={4}>
        <Breadcrumb separator={<FiChevronRight color="gray.500" />}>
          {breadcrumbs().map((crumb, index) => (
            <BreadcrumbItem
              key={crumb.path}
              isCurrentPage={index === breadcrumbs().length - 1}
            >
              <BreadcrumbLink
                onClick={() => handleBreadcrumbClick(crumb.path)}
                color="green.500"
              >
                {crumb.name || "Home"}
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      </Box>

      <Divider my="4" borderColor="gray.200" />

      {/* Filters and Search */}
      <Flex gap={6} justify="space-between" align="stretch" wrap="wrap">
        <Box flex="1" minW={{ base: "100%", md: "65%" }}>
          <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
            <Input
              placeholder="Search Files/Folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              w={{ base: "100%", md: "250px" }}
              borderColor="green.300"
              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
              bg="white"
              color="gray.800"
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "folder" | "file")}
              w={{ base: "100%", md: "200px" }}
              borderColor="green.300"
              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
              bg="white"
              color="gray.700"
            >
              <option value="all">All</option>
              <option value="folder">Folders</option>
              <option value="file">Files</option>
            </Select>
          </Flex>

          {/* Sorting Headers */}
          <Flex bg="gray.100" p={2} borderRadius="md" mb={2}>
            <Box flex="2" cursor="pointer" onClick={() => handleSort("name")}>
              <HStack>
                <Text fontWeight="bold">Name</Text>
                {sortField === "name" && (sortOrder === "asc" ? <FiArrowUp /> : <FiArrowDown />)}
              </HStack>
            </Box>
            <Box flex="1" cursor="pointer" onClick={() => handleSort("size")}>
              <HStack>
                <Text fontWeight="bold">Size</Text>
                {sortField === "size" && (sortOrder === "asc" ? <FiArrowUp /> : <FiArrowDown />)}
              </HStack>
            </Box>
            <Box flex="1" cursor="pointer" onClick={() => handleSort("lastModified")}>
              <HStack>
                <Text fontWeight="bold">Modified</Text>
                {sortField === "lastModified" && (sortOrder === "asc" ? <FiArrowUp /> : <FiArrowDown />)}
              </HStack>
            </Box>
            <Box flex="1" textAlign="right">
              <Text fontWeight="bold">Actions</Text>
            </Box>
          </Flex>

          {/* File/Folder List */}
          <VStack spacing={4} align="stretch">
            {filteredObjects.map((obj, index) => (
              <Box
                key={`${obj.path}-${index}`}
                p={4}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="gray.200"
                bg="white"
              >
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap={2}>
                    {obj.type === "folder" ? (
                      <IconButton
                        aria-label={expandedFolders.includes(obj.path) ? "Collapse" : "Expand"}
                        icon={expandedFolders.includes(obj.path) ? <FiChevronDown /> : <FiChevronRight />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFolderClick(obj.path)}
                      />
                    ) : null}
                    {obj.type === "folder" ? <FiFolder /> : getFileIcon(obj.name)}
                    <Box>
                      <Text fontWeight="medium" color="gray.800">
                        {obj.name}
                      </Text>
                      {obj.type === "file" && (
                        <>
                          <Text fontSize="sm" color="gray.500">
                            Size: {obj.size ? (obj.size / 1024).toFixed(2) : "0"} KB
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Modified: {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : "-"}
                          </Text>
                        </>
                      )}
                    </Box>
                  </Flex>
                  {obj.type === "folder" ? (
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => handleFolderClick(obj.path)}
                    >
                      Open
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      leftIcon={<FiDownload />}
                      onClick={() => handleDownload(obj.path)}
                      isDisabled={isFetching}
                    >
                      Download
                    </Button>
                  )}
                </Flex>
              </Box>
            ))}
            {filteredObjects.length === 0 && !isFetching && (
              <Text fontSize="sm" color="gray.500">
                No items match your criteria
              </Text>
            )}
            {isFetching ? (
              <Text fontSize="sm" color="gray.500">Loading...</Text>
            ) : (
              filteredObjects.length > 0 && (
                <Button
                  colorScheme="green"
                  size="sm"
                  onClick={handleLoadMore}
                  mt={4}
                  alignSelf="center"
                >
                  Load More
                </Button>
              )
            )}
          </VStack>
        </Box>
        <Box w={{ base: "100%", md: "250px" }} p={4} borderLeft={{ md: "1px solid" }} borderColor="gray.200">
          {/* Sidebar placeholder for future use */}
        </Box>
      </Flex>
    </Container>
  );
}

export default FileExplorer;