
import React, { useState, useEffect, useRef } from "react";
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Image,
  useDisclosure,
  Textarea,
  SimpleGrid,
  Tooltip,
} from "@chakra-ui/react";
import { FiFolder, FiFile, FiDownload, FiChevronRight, FiChevronDown, FiArrowUp, FiArrowDown, FiCopy, FiInfo, FiGrid, FiList, FiEye, FiEyeOff } from "react-icons/fi";
import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFile } from "react-icons/fa";

const API_BASE_URL = "https://api.iconluxury.group/api/v1";

interface S3Object {
  type: "folder" | "file";
  name: string;
  path: string;
  size?: number;
  lastModified?: Date;
  count?: number;
}

async function listS3Objects(prefix: string, page: number, pageSize = 10, continuationToken: string | null = null): Promise<{ objects: S3Object[], hasMore: boolean, nextContinuationToken: string | null }> {
  try {
    const url = new URL(`${API_BASE_URL}/s3/list`);
    url.searchParams.append("prefix", prefix);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("pageSize", pageSize.toString());
    if (continuationToken) {
      url.searchParams.append("continuation_token", continuationToken);
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 404) {
        errorMessage = "S3 list endpoint not found. Check API URL and server configuration.";
      } else if (response.status === 403) {
        errorMessage = "Access denied to S3 bucket. Verify credentials and permissions.";
      }
      throw new Error(`Failed to list objects: ${errorMessage}`);
    }
    const data = await response.json();
    const objects = data.objects.map((item: any) => ({
      ...item,
      lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
    }));
    return {
      objects,
      hasMore: data.hasMore,
      nextContinuationToken: data.nextContinuationToken || null
    };
  } catch (error: any) {
    console.error("Error fetching S3 objects:", error);
    const message = error.message?.includes("CORS")
      ? "CORS error: Ensure the FastAPI server is configured to allow requests from https://dashboard.iconluxury.group."
      : error.message || "Unknown error fetching S3 objects";
    throw new Error(message);
  }
}

async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/s3/sign?key=${encodeURIComponent(key)}&expires_in=${expiresIn}`
    );
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 404) {
        errorMessage = "S3 sign endpoint not found. Check API URL and server configuration.";
      } else if (response.status === 403) {
        errorMessage = "Access denied to generate signed URL. Verify credentials and permissions.";
      }
      throw new Error(`Failed to get signed URL: ${errorMessage}`);
    }
    const data = await response.json();
    return data.signedUrl;
  } catch (error: any) {
    console.error("Error fetching signed URL:", error);
    throw new Error(`Failed to get signed URL: ${error.message || "Unknown error"}`);
  }
}

async function getFileContent(key: string): Promise<string> {
  const url = await getSignedUrl(key);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch file content");
  return response.text();
}

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
    case "xlsm":
      return <FaFileExcel />;
    case "log":
      return <FiFile />;
    default:
      return <FiFile />;
  }
};

const getFileType = (name: string) => {
  const extension = (name.split(".").pop()?.toLowerCase() || "");
  if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
  if (["txt", "json", "md", "log", "xlsx", "xlsm"].includes(extension)) return "text";
  if (extension === "pdf") return "pdf";
  return "unsupported";
};

// Custom truncation to show start and end of name
const truncateName = (name: string, maxLength: number = 20) => {
  if (name.length <= maxLength) return name;
  const start = name.slice(0, Math.floor(maxLength / 2));
  const end = name.slice(-Math.floor(maxLength / 2));
  return `${start}...${end}`;
};

// Resize Handle Component
const ResizeHandle = ({ onResize }: { onResize: (newWidth: number) => void }) => {
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = handleRef.current?.parentElement?.offsetWidth || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.8;
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onResize(constrainedWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <Box
      ref={handleRef}
      w="6px"
      bg="gray.300"
      cursor="col-resize"
      _hover={{ bg: "gray.400" }}
      onMouseDown={handleMouseDown}
      position="absolute"
      top="0"
      bottom="0"
      left="-3px"
    />
  );
};

export const Route = createFileRoute("/_layout/scraping-api/explore-assets")({
  component: FileExplorer,
});

function FileExplorer() {
  const toast = useToast();
  const { isOpen: isDetailsOpen, onOpen: onDetailsOpen, onClose: onDetailsClose } = useDisclosure();
  const [currentPath, setCurrentPath] = useState("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "file">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "size" | "lastModified" | "count">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [detailsWidth, setDetailsWidth] = useState(600); // Initial width for details modal
  const [previewWidth, setPreviewWidth] = useState(300); // Initial width for preview panel

  const { data, isFetching, error: s3Error } = useQuery<{ objects: S3Object[], hasMore: boolean, nextContinuationToken: string | null }, Error>({
    queryKey: ["s3Objects", currentPath, page, continuationToken],
    queryFn: () => listS3Objects(currentPath, page, 10, continuationToken),
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (data?.objects) {
      setObjects((prev) => {
        const newObjects = page === 1 ? data.objects : [...prev, ...data.objects];
        const uniqueObjects = Array.from(
          new Map(newObjects.map((obj) => [obj.path, obj])).values()
        );
        return uniqueObjects;
      });
      setHasMore(data.hasMore);
      setContinuationToken(data.nextContinuationToken);
    }
  }, [data, page]);

  const handleFolderClick = (path: string) => {
    if (expandedFolders.includes(path)) {
      setExpandedFolders(expandedFolders.filter((p) => p !== path));
    } else {
      setExpandedFolders([...expandedFolders, path]);
      setCurrentPath(path);
      setPage(1);
      setObjects([]);
      setContinuationToken(null);
      setSelectedFile(null);
      setPreviewUrl("");
      setPreviewContent("");
    }
  };

  const handleFileClick = async (obj: S3Object, action: "details" | "select") => {
    if (action === "select") {
      setSelectedFile(obj);
      try {
        const url = await getSignedUrl(obj.path);
        setPreviewUrl(url);
        const fileType = getFileType(obj.name);
        if (fileType === "text") {
          const content = await getFileContent(obj.path);
          setPreviewContent(content);
        } else {
          setPreviewContent("");
        }
      } catch (error: any) {
        toast({
          title: "Preview Failed",
          description: error.message || "Unable to load file preview",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } else {
      setSelectedFile(obj);
      try {
        const url = await getSignedUrl(obj.path);
        setPreviewUrl(url);
        onDetailsOpen();
      } catch (error: any) {
        toast({
          title: "Details Failed",
          description: error.message || "Unable to load file details",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
    setObjects([]);
    setPage(1);
    setContinuationToken(null);
    setExpandedFolders(expandedFolders.filter((p) => !p.startsWith(path) || p === path));
    setSelectedFile(null);
    setPreviewUrl("");
    setPreviewContent("");
  };

  const handleGoBack = () => {
    const parentPath = currentPath.split("/").slice(0, -2).join("/") + "/";
    setCurrentPath(parentPath);
    setObjects([]);
    setPage(1);
    setContinuationToken(null);
    setExpandedFolders(expandedFolders.filter((p) => !p.startsWith(parentPath) || p === parentPath));
    setSelectedFile(null);
    setPreviewUrl("");
    setPreviewContent("");
  };

  const handleDownload = async (key: string, name: string) => {
    try {
      const url = await getSignedUrl(key);
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

  const handleCopyUrl = async (key: string, name: string) => {
    try {
      const url = await getSignedUrl(key);
      await navigator.clipboard.writeText(url);
      toast({
        title: "URL Copied",
        description: "Public URL copied to clipboard",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: "Copy Failed",
        description: error.message || "Unable to copy URL",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Content Copied",
        description: "Preview content copied to clipboard",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: "Copy Failed",
        description: error.message || "Unable to copy content",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLoadMore = () => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleSort = (field: "name" | "size" | "lastModified" | "count") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

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
      } else if (sortField === "count") {
        comparison = (a.count || 0) - (b.count || 0);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const renderPreview = (obj: S3Object | null, url: string, content: string) => {
    if (!obj) return <Text fontSize="sm" color="gray.500">Select a file to preview</Text>;
    const fileType = getFileType(obj.name);

    return (
      <VStack align="stretch" spacing={2}>
        {fileType === "image" && (
          <Image
            src={url}
            alt={obj.name}
            maxW="100%"
            maxH="50vh"
            objectFit="contain"
            objectPosition="center"
          />
        )}
        {fileType === "text" && (
          <Textarea value={content} isReadOnly resize="none" h="50vh" fontFamily="mono" fontSize="sm" />
        )}
        {fileType === "pdf" && (
          <iframe
            src={url}
            title={obj.name}
            style={{ width: "100%", height: "50vh" }}
          />
        )}
        {fileType === "unsupported" && (
          <Text>
            Preview not available for this file type.{" "}
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => handleDownload(obj.path, obj.name)}
            >
              Download
            </Button>
          </Text>
        )}
        <HStack justify="flex-end">
          {fileType === "text" && content && (
            <Tooltip label="Copy Preview Content">
              <Button
                size="sm"
                colorScheme="gray"
                leftIcon={<FiCopy />}
                onClick={() => handleCopyContent(content)}
              >
                Copy
              </Button>
            </Tooltip>
          )}
          {url && (
            <Tooltip label="Copy Source URL">
              <Button
                size="sm"
                colorScheme="gray"
                leftIcon={<FiCopy />}
                onClick={() => handleCopyUrl(obj.path, obj.name)}
              >
                Copy URL
              </Button>
            </Tooltip>
          )}
        </HStack>
      </VStack>
    );
  };

  if (s3Error) {
    return (
      <Container maxW="full" bg="white" color="gray.800" py={6}>
        <Text color="red.500">{s3Error.message}</Text>
      </Container>
    );
  }

  return (
    <Container maxW="full" bg="white" color="gray.800" py={6}>
      <Flex align="center" justify="space-between" flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">
            File Explorer
          </Text>
          <Text fontSize="sm" color="gray.600">
            Browse and download files from S3 storage
          </Text>
        </Box>
        <HStack>
          <Tooltip label={isPreviewOpen ? "Hide Preview" : "Show Preview"}>
            <IconButton
              aria-label={isPreviewOpen ? "Hide Preview" : "Show Preview"}
              icon={isPreviewOpen ? <FiEyeOff /> : <FiEye />}
              size="sm"
              colorScheme={isPreviewOpen ? "green" : "gray"}
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            />
          </Tooltip>
          <IconButton
            aria-label="List View"
            icon={<FiList />}
            size="sm"
            colorScheme={viewMode === "list" ? "green" : "gray"}
            onClick={() => setViewMode("list")}
          />
          <IconButton
            aria-label="Grid View"
            icon={<FiGrid />}
            size="sm"
            colorScheme={viewMode === "grid" ? "green" : "gray"}
            onClick={() => setViewMode("grid")}
          />
          {currentPath && (
            <Button size="sm" variant="outline" colorScheme="green" onClick={handleGoBack}>
              Back
            </Button>
          )}
        </HStack>
      </Flex>

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

      <Flex gap={6} justify="space-between" align="stretch" wrap="wrap">
        <Box
          flex="1"
          minW={{ base: "100%", md: "40%" }}
          maxH="70vh"
          overflowY="auto"
          overflowX="auto"
          pr={isPreviewOpen ? 0 : 4}
        >
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

          {viewMode === "list" && (
            <Flex bg="gray.100" p={2} borderRadius="md" mb={2}>
              <Box flex="2" cursor="pointer" onClick={() => handleSort("name")}>
                <HStack>
                  <Text fontWeight="bold">Name</Text>
                  {sortField === "name" && (sortOrder === "asc" ? <FiArrowUp /> : <FiArrowDown />)}
                </HStack>
              </Box>
              <Box flex="1" cursor="pointer" onClick={() => handleSort("count")}>
                <HStack>
                  <Text fontWeight="bold">Count</Text>
                  {sortField === "count" && (sortOrder === "asc" ? <FiArrowUp /> : <FiArrowDown />)}
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
          )}

          {viewMode === "list" ? (
            <VStack spacing={4} align="stretch">
              {filteredObjects.map((obj, index) => (
                <Box
                  key={`${obj.path}-${index}`}
                  p={4}
                  borderWidth="1px"
                  borderRadius="lg"
                  borderColor={selectedFile?.path === obj.path ? "green.500" : "gray.200"}
                  bg={selectedFile?.path === obj.path ? "green.50" : "white"}
                  cursor={obj.type === "folder" ? "pointer" : "pointer"}
                  _hover={{ bg: obj.type === "folder" ? "gray.50" : selectedFile?.path === obj.path ? "green.50" : "gray.50" }}
                  onClick={() => obj.type === "folder" ? handleFolderClick(obj.path) : handleFileClick(obj, "select")}
                >
                  <Flex justify="space-between" align="center">
                    <Flex align="center" gap={2} flex="2">
                      {obj.type === "folder" ? (
                        <IconButton
                          aria-label={expandedFolders.includes(obj.path) ? "Collapse" : "Expand"}
                          icon={expandedFolders.includes(obj.path) ? <FiChevronDown /> : <FiChevronRight />}
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFolderClick(obj.path);
                          }}
                        />
                      ) : null}
                      {obj.type === "folder" ? <FiFolder /> : getFileIcon(obj.name)}
                      <Box>
                        <Text fontWeight="medium" color="gray.800">
                          {truncateName(obj.name, 30)}
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
                    <Box flex="1">
                      <Text fontSize="sm" color="gray.500">
                        {obj.count ?? "-"}
                      </Text>
                    </Box>
                    <Box flex="1">
                      <Text fontSize="sm" color="gray.500">
                        {obj.size ? (obj.size / 1024).toFixed(2) : "-"} KB
                      </Text>
                    </Box>
                    <Box flex="1">
                      <Text fontSize="sm" color="gray.500">
                        {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : "-"}
                      </Text>
                    </Box>
                    <HStack flex="1" justify="flex-end">
                      {obj.type === "file" && (
                        <>
                          <Tooltip label="Details">
                            <IconButton
                              aria-label="Details"
                              icon={<FiInfo />}
                              size="sm"
                              colorScheme="purple"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileClick(obj, "details");
                              }}
                              isDisabled={isFetching}
                            />
                          </Tooltip>
                          <Tooltip label="Download">
                            <IconButton
                              aria-label="Download"
                              icon={<FiDownload />}
                              size="sm"
                              colorScheme="blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(obj.path, obj.name);
                              }}
                              isDisabled={isFetching}
                            />
                          </Tooltip>
                          <Tooltip label="Copy URL">
                            <IconButton
                              aria-label="Copy URL"
                              icon={<FiCopy />}
                              size="sm"
                              colorScheme="gray"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyUrl(obj.path, obj.name);
                              }}
                              isDisabled={isFetching}
                            />
                          </Tooltip>
                        </>
                      )}
                    </HStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
              {filteredObjects.map((obj, index) => (
                <Box
                  key={`${obj.path}-${index}`}
                  p={4}
                  borderWidth="1px"
                  borderRadius="lg"
                  borderColor={selectedFile?.path === obj.path ? "green.500" : "gray.200"}
                  bg={selectedFile?.path === obj.path ? "green.50" : "white"}
                  cursor={obj.type === "folder" ? "pointer" : "pointer"}
                  _hover={{ bg: obj.type === "folder" ? "gray.50" : selectedFile?.path === obj.path ? "green.50" : "gray.50" }}
                  onClick={() => obj.type === "folder" ? handleFolderClick(obj.path) : handleFileClick(obj, "select")}
                >
                  <VStack align="start" spacing={2}>
                    <HStack>
                      {obj.type === "folder" ? <FiFolder /> : getFileIcon(obj.name)}
                      <Text fontWeight="medium" color="gray.800" maxW="150px">
                        {truncateName(obj.name, 20)}
                      </Text>
                    </HStack>
                    {obj.type === "file" && (
                      <>
                        <Text fontSize="xs" color="gray.500">
                          Size: {obj.size ? (obj.size / 1024).toFixed(2) : "0"} KB
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Modified: {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : "-"}
                        </Text>
                      </>
                    )}
                    {obj.type === "folder" && (
                      <Text fontSize="xs" color="gray.500">
                        Items: {obj.count ?? "-"}
                      </Text>
                    )}
                    {obj.type === "file" && (
                      <HStack>
                        <Tooltip label="Details">
                          <IconButton
                            aria-label="Details"
                            icon={<FiInfo />}
                            size="sm"
                            colorScheme="purple"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileClick(obj, "details");
                            }}
                            isDisabled={isFetching}
                          />
                        </Tooltip>
                        <Tooltip label="Download">
                          <IconButton
                            aria-label="Download"
                            icon={<FiDownload />}
                            size="sm"
                            colorScheme="blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(obj.path, obj.name);
                            }}
                            isDisabled={isFetching}
                          />
                        </Tooltip>
                      </HStack>
                    )}
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
          {filteredObjects.length === 0 && !isFetching && (
            <Text fontSize="sm" color="gray.500" mt={4}>
              No items match your criteria
            </Text>
          )}
          {isFetching && <Text fontSize="sm" color="gray.500" mt={4}>Loading...</Text>}
          {!isFetching && hasMore && filteredObjects.length > 0 && (
            <Button
              colorScheme="green"
              size="sm"
              onClick={handleLoadMore}
              mt={4}
              alignSelf="center"
              isDisabled={isFetching}
            >
              Load More
            </Button>
          )}
        </Box>

        {isPreviewOpen ? (
          <Box
            w={{ base: "100%", md: `${previewWidth}px`}}
            p={4}
            borderLeft={{ md: "1px solid" }}
            borderColor="gray.200"
            position="sticky"
            top="0"
            alignSelf="flex-start"
            maxH="70vh"
            overflowY="auto"
            pos="relative"
          >
            <ResizeHandle onResize={setPreviewWidth} />
            <Text fontWeight="bold" mb={2}>Preview</Text>
            <Box>
              {renderPreview(selectedFile, previewUrl, previewContent)}
            </Box>
          </Box>
        ) : (
          <IconButton
            aria-label="Show Preview"
            icon={<FiEye />}
            size="sm"
            colorScheme="gray"
            onClick={() => setIsPreviewOpen(true)}
            position="sticky"
            top="0"
            alignSelf="flex-start"
          />
        )}
      </Flex>

      <Modal isOpen={isDetailsOpen} onClose={onDetailsClose}>
        <ModalOverlay />
        <ModalContent w={`${detailsWidth}px`} maxW="80vw" pos="relative">
          <ResizeHandle onResize={setDetailsWidth} />
          <ModalHeader>File/Folder Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="start" spacing={2}>
              <Text><strong>Name:</strong> {selectedFile?.name}</Text>
              <Text><strong>Path:</strong> {selectedFile?.path}</Text>
              <Text><strong>Type:</strong> {selectedFile?.type}</Text>
              {selectedFile?.type === "file" && (
                <>
                  <Text><strong>Size:</strong> {selectedFile.size ? (selectedFile.size / 1024).toFixed(2) : "0"} KB</Text>
                  <Text><strong>Modified:</strong> {selectedFile.lastModified ? new Date(selectedFile.lastModified).toLocaleString() : "-"}</Text>
                </>
              )}
              {selectedFile?.type === "folder" && (
                <Text><strong>Item Count:</strong> {selectedFile.count ?? "Unknown"}</Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onDetailsClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default FileExplorer;
