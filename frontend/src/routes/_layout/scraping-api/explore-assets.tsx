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
  Icon,
} from "@chakra-ui/react";
import { FiFolder, FiFile, FiDownload, FiChevronRight, FiChevronDown, FiArrowUp, FiArrowDown, FiCopy, FiEye, FiInfo } from "react-icons/fi";
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
  count?: number; // New field for folder item count (requires backend support)
}

interface LogEntry {
  id: number;
  action: string;
  file: string;
  timestamp: string;
}

async function listS3Objects(prefix: string, page: number, pageSize = 10): Promise<{ objects: S3Object[], hasMore: boolean }> {
  try {
    const response = await fetch(
      `https://api.iconluxury.group/api/v1/s3/list?prefix=${encodeURIComponent(prefix)}&page=${page}&pageSize=${pageSize}`
    );
    if (!response.ok) {
      throw new Error(`Failed to list objects: ${response.statusText}`);
    }
    const data = await response.json();
    const objects = data.map((item: any) => ({
      ...item,
      lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
    }));
    // Assume hasMore is true if the response returns pageSize items
    const hasMore = data.length === pageSize;
    return { objects, hasMore };
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

async function getFileContent(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch file content");
  return response.text();
}

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
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const { isOpen: isDetailsOpen, onOpen: onDetailsOpen, onClose: onDetailsClose } = useDisclosure();
  const [currentPath, setCurrentPath] = useState("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "file">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true); // Track if more pages are available
  const [sortField, setSortField] = useState<"name" | "size" | "lastModified" | "count">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const { data, isFetching, error: s3Error } = useQuery<{ objects: S3Object[], hasMore: boolean }, Error>({
    queryKey: ["s3Objects", currentPath, page],
    queryFn: () => listS3Objects(currentPath, page),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data?.objects) {
      setObjects((prev) => {
        // Deduplicate objects by path
        const newObjects = page === 1 ? data.objects : [...prev, ...data.objects];
        const uniqueObjects = Array.from(
          new Map(newObjects.map((obj) => [obj.path, obj])).values()
        );
        return uniqueObjects;
      });
      setHasMore(data.hasMore);
    }
  }, [data, page]);

  // Add log entry
  const addLog = (action: string, file: string) => {
    setLogs((prev) => [
      {
        id: Date.now(),
        action,
        file,
        timestamp: new Date().toLocaleString(),
      },
      ...prev.slice(0, 9), // Keep last 10 logs
    ]);
  };

  // Handle folder click (navigate or toggle expansion)
  const handleFolderClick = (path: string) => {
    if (expandedFolders.includes(path)) {
      setExpandedFolders(expandedFolders.filter((p) => p !== path));
    } else {
      setExpandedFolders([...expandedFolders, path]);
      setCurrentPath(path);
      setPage(1);
      setObjects([]); // Reset objects when navigating
    }
  };

  // Handle file click (open preview)
  const handleFileClick = async (obj: S3Object, action: "preview" | "details") => {
    setSelectedFile(obj);
    try {
      const url = await getDownloadUrl(obj.path);
      setFileUrl(url);
      addLog(action === "preview" ? "Previewed" : "Viewed Details", obj.name);

      if (action === "preview") {
        const fileType = getFileType(obj.name);
        if (fileType === "text") {
          const content = await getFileContent(obj.path);
          setFileContent(content);
        } else {
          setFileContent("");
        }
        onPreviewOpen();
      } else {
        onDetailsOpen();
      }
    } catch (error: any) {
      toast({
        title: `${action === "preview" ? "Preview" : "Details"} Failed`,
        description: error.message || `Unable to load file ${action}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
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
  const handleDownload = async (key: string, name: string) => {
    try {
      const url = await getDownloadUrl(key);
      window.open(url, "_blank");
      addLog("Downloaded", name);
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

  // Handle copy public URL
  const handleCopyUrl = async (key: string, name: string) => {
    try {
      const url = await getDownloadUrl(key);
      await navigator.clipboard.writeText(url);
      toast({
        title: "URL Copied",
        description: "Public URL copied to clipboard",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      addLog("Copied URL", name);
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

  // Handle load more for pagination
  const handleLoadMore = () => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  // Handle sorting
  const handleSort = (field: "name" | "size" | "lastModified" | "count") => {
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
      } else if (sortField === "count") {
        comparison = (a.count || 0) - (b.count || 0);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Render file preview
  const renderPreview = () => {
    if (!selectedFile) return null;
    const fileType = getFileType(selectedFile.name);

    switch (fileType) {
      case "image":
        return <Image src={fileUrl} alt={selectedFile.name} maxH="70vh" objectFit="contain" />;
      case "text":
        return (
          <Textarea value={fileContent} isReadOnly resize="none" h="50vh" fontFamily="mono" />
        );
      case "pdf":
        return (
          <iframe
            src={fileUrl}
            title={selectedFile.name}
            style={{ width: "100%", height: "70vh" }}
          />
        );
      default:
        return (
          <Text>
            Preview not available for this file type.{" "}
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => handleDownload(selectedFile.path, selectedFile.name)}
            >
              Download
            </Button>
          </Text>
        );
    }
  };

  // Render file details
  const renderDetails = () => {
    if (!selectedFile) return null;
    return (
      <VStack align="start" spacing={2}>
        <Text><strong>Name:</strong> {selectedFile.name}</Text>
        <Text><strong>Path:</strong> {selectedFile.path}</Text>
        <Text><strong>Type:</strong> {selectedFile.type}</Text>
        {selectedFile.type === "file" && (
          <>
            <Text><strong>Size:</strong> {selectedFile.size ? (selectedFile.size / 1024).toFixed(2) : "0"} KB</Text>
            <Text><strong>Modified:</strong> {selectedFile.lastModified ? new Date(selectedFile.lastModified).toLocaleString() : "-"}</Text>
          </>
        )}
        {selectedFile.type === "folder" && (
          <Text><strong>Item Count:</strong> {selectedFile.count ?? "Unknown"}</Text>
        )}
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

      {/* Filters, Search, and Logs */}
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
                cursor={obj.type === "folder" ? "pointer" : "default"}
                _hover={{ bg: obj.type === "folder" ? "gray.50" : "white" }}
                onClick={() => obj.type === "folder" && handleFolderClick(obj.path)}
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
                        <IconButton
                          aria-label="Preview"
                          icon={<FiEye />}
                          size="sm"
                          colorScheme="green"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileClick(obj, "preview");
                          }}
                          isDisabled={isFetching || getFileType(obj.name) === "unsupported"}
                        />
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
                      </>
                    )}
                  </HStack>
                </Flex>
              </Box>
            ))}
            {filteredObjects.length === 0 && !isFetching && (
              <Text fontSize="sm" color="gray.500">
                No items match your criteria
              </Text>
            )}
            {isFetching && <Text fontSize="sm" color="gray.500">Loading...</Text>}
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
          </VStack>
        </Box>
        <Box w={{ base: "100%", md: "250px" }} p={4} borderLeft={{ md: "1px solid" }} borderColor="gray.200">
          <Text fontWeight="bold" mb={2}>Action Logs</Text>
          <VStack spacing={2} align="stretch" maxH="70vh" overflowY="auto">
            {logs.length === 0 ? (
              <Text fontSize="sm" color="gray.500">No actions logged</Text>
            ) : (
              logs.map((log) => (
                <Box key={log.id} p={2} bg="gray.50" borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium">{log.action}: {log.file}</Text>
                  <Text fontSize="xs" color="gray.500">{log.timestamp}</Text>
                </Box>
              ))
            )}
          </VStack>
        </Box>
      </Flex>

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedFile?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{renderPreview()}</ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onPreviewClose}>
              Close
            </Button>
            {selectedFile && (
              <Button
                colorScheme="green"
                leftIcon={<FiDownload />}
                onClick={() => handleDownload(selectedFile.path, selectedFile.name)}
              >
                Download
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={isDetailsOpen} onClose={onDetailsClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>File/Folder Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{renderDetails()}</ModalBody>
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