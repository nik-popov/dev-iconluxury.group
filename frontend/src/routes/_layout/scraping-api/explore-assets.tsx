import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
} from "@chakra-ui/react";
import { FiFolder, FiFile, FiDownload } from "react-icons/fi";
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
  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: prefix,
    Delimiter: "/",
    MaxKeys: pageSize,
    StartAfter: page > 1 ? `${prefix}${(page - 1) * pageSize}` : undefined,
  });
  const data = await s3Client.send(command);
  const folders: S3Object[] = (data.CommonPrefixes || []).map((prefix) => ({
    type: "folder",
    name: prefix.Prefix?.replace(prefix.Prefix || "", "").replace("/", "") || "",
    path: prefix.Prefix || "",
  }));
  const files: S3Object[] = (data.Contents || [])
    .filter((obj) => obj.Key && obj.Key !== prefix && !obj.Key.endsWith("/"))
    .map((obj) => ({
      type: "file",
      name: obj.Key?.replace(prefix || "", "") || "",
      path: obj.Key || "",
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  return [...folders, ...files];
}

async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export const Route = createFileRoute("/_layout/scraping-api/explore-assets")({
  component: FileExplorer,
});

function FileExplorer() {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentPath, setCurrentPath] = useState("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "file">("all");
  const [page, setPage] = useState(1);

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

  const handleFolderClick = (path: string) => {
    setCurrentPath(path);
    setObjects([]);
    setPage(1);
  };

  const handleGoBack = () => {
    const parentPath = currentPath.split("/").slice(0, -2).join("/") + "/";
    setCurrentPath(parentPath);
    setObjects([]);
    setPage(1);
  };

  const handleDownload = async (key: string) => {
    try {
      const url = await getDownloadUrl(key);
      window.open(url, "_blank");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to generate download URL";
      toast({
        title: "Download Failed",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLoadMore = () => setPage((prev) => prev + 1);

  const filteredObjects = objects.filter((obj) => {
    const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || obj.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (s3Error) {
    return (
      <Container maxW="full" bg="white" color="gray.800" py={6}>
        <Text color="red.500">Error loading files: {s3Error.message}</Text>
      </Container>
    );
  }

  return (
    <Container maxW="full" bg="white" color="gray.800" py={6}>
      <Flex align="center" justify="space-between" flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">
            S3 File Explorer
          </Text>
          <Text fontSize="sm" color="gray.600">
            Browse and download files from R2 storage
          </Text>
        </Box>
        {currentPath && (
          <Button size="sm" variant="outline" colorScheme="green" onClick={handleGoBack}>
            Back
          </Button>
        )}
      </Flex>
      <Divider my="4" borderColor="gray.200" />
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
                    {obj.type === "folder" ? <FiFolder /> : <FiFile />}
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
                    <Button size="sm" colorScheme="green" onClick={() => handleFolderClick(obj.path)}>
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
          <VStack spacing={4} align="stretch">
            <Text fontWeight="bold" color="black">
              Quick Actions
            </Text>
            <Button as="a" href="/s3-explorer/upload" variant="outline" size="sm" colorScheme="green">
              Upload File
            </Button>
            <Button as="a" href="/s3-explorer/create-folder" variant="outline" size="sm" colorScheme="green">
              Create Folder
            </Button>
          </VStack>
        </Box>
      </Flex>
    </Container>
  );
}

export default FileExplorer;