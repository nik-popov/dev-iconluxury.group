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
  HStack,
  Input,
  Select,
} from "@chakra-ui/react";
import { FiFolder, FiFile, FiDownload } from "react-icons/fi";
import AWS, { S3 } from "aws-sdk";

// Configuration for Cloudflare R2 (S3-compatible)
const S3_BUCKET = "iconluxurygroup";
const REGION = "auto";
const ENDPOINT = "https://aa2f6aae69e7fb4bd8e2cd4311c411cb.r2.cloudflarestorage.com";

// Configure AWS SDK for R2
AWS.config.update({
  accessKeyId: "AKIA2CUNLEV6V627SWI7",
  secretAccessKey: "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",
  region: REGION,
  s3ForcePathStyle: true,
});
const s3 = new AWS.S3({ endpoint: ENDPOINT });

interface SubscriptionStatus {
  hasSubscription: boolean;
  isTrial: boolean;
  isDeactivated: boolean;
}

interface S3Object {
  type: "folder" | "file";
  name: string;
  path: string;
  size?: number;
  lastModified?: Date;
}

interface S3ListResponse {
  folders: S3Object[];
  files: S3Object[];
  nextToken: string | undefined;
}

const getAuthToken = (): string | null => localStorage.getItem("access_token");

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = getAuthToken();
  const response = await fetch("https://api.iconluxury.group/api/v1/subscription-status/s3", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized: Please log in again.");
    }
    throw new Error(`Failed to fetch subscription status: ${response.status}`);
  }
  return response.json();
}

async function listS3Objects(prefix = "", continuationToken?: string): Promise<S3ListResponse> {
  const params: S3.ListObjectsV2Request = {
    Bucket: S3_BUCKET,
    Prefix: prefix,
    Delimiter: "/",
    ContinuationToken: continuationToken,
  };

  const data = await s3.listObjectsV2(params).promise();
  const folders = (data.CommonPrefixes || []).map((prefix) => ({
    type: "folder" as const,
    name: prefix.Prefix!.replace(params.Prefix, "").replace("/", ""),
    path: prefix.Prefix!,
  }));
  const files = (data.Contents || [])
    .filter((obj) => obj.Key !== prefix && !obj.Key!.endsWith("/"))
    .map((obj) => ({
      type: "file" as const,
      name: obj.Key!.replace(params.Prefix, ""),
      path: obj.Key!,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));

  return { folders, files, nextToken: data.NextContinuationToken };
}

async function getDownloadUrl(key: string): Promise<string> {
  const params: S3.GetObjectRequest = {
    Bucket: S3_BUCKET,
    Key: key,
    Expires: 3600,
  };
  return s3.getSignedUrlPromise("getObject", params);
}

export const Route = createFileRoute("/_layout/scraping-api/file-explorer")({
  component: FileExplorer,
});

function FileExplorer() {
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "file">("all");
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const { data: subscriptionStatus, isLoading: isSubLoading, error: subError } = useQuery({
    queryKey: ["subscriptionStatus", "s3"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount: number, error: Error) => (error.message.includes("Unauthorized") ? false : failureCount < 3),
  });

  const { data, isFetching } = useQuery({
    queryKey: ["s3Objects", currentPath],
    queryFn: () => listS3Objects(currentPath),
    placeholderData: keepPreviousData,
    enabled: !!subscriptionStatus?.hasSubscription || !!subscriptionStatus?.isTrial,
  });

  useEffect(() => {
    if (data) {
      setObjects((prev) => (continuationToken ? [...prev, ...[...data.folders, ...data.files]] : [...data.folders, ...data.files]));
      setContinuationToken(data.nextToken);
    }
  }, [data, continuationToken]);

  const handleFolderClick = (path: string) => {
    setCurrentPath(path);
    setObjects([]);
    setContinuationToken(undefined);
  };

  const handleGoBack = () => {
    const parentPath = currentPath.split("/").slice(0, -2).join("/") + "/";
    setCurrentPath(parentPath);
    setObjects([]);
    setContinuationToken(undefined);
  };

  const handleDownload = async (key: string) => {
    try {
      const url = await getDownloadUrl(key);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error generating download URL:", error);
    }
  };

  const handleLoadMore = async () => {
    if (continuationToken && !loadingMore) {
      setLoadingMore(true);
      try {
        const moreData = await listS3Objects(currentPath, continuationToken);
        setObjects((prev) => [...prev, ...[...moreData.folders, ...moreData.files]]);
        setContinuationToken(moreData.nextToken);
      } catch (error) {
        console.error("Error loading more objects:", error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const filteredObjects = objects.filter((obj) => {
    const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || obj.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isSubLoading) {
    return (
      <Container maxW="full" bg="white" color="gray.800">
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (subError) {
    return (
      <Container maxW="full" bg="white" color="gray.800">
        <Text color="red.500">
          {subError.message.includes("Unauthorized") ? "Session expired. Please log in again." : "Error loading status."}
        </Text>
        {subError.message.includes("Unauthorized") && (
          <Button mt={4} colorScheme="blue" onClick={() => navigate({ to: "/login" })}>
            Log In
          </Button>
        )}
      </Container>
    );
  }

  const { hasSubscription, isTrial, isDeactivated } = subscriptionStatus || {
    hasSubscription: false,
    isTrial: false,
    isDeactivated: false,
  };
  const isLocked = !hasSubscription && !isTrial;

  return (
    <Container maxW="full" bg="white" color="gray.800">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
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
      <Divider my={4} borderColor="gray.200" />
      {isLocked ? (
        <Text>Access restricted. Please subscribe or start a trial.</Text>
      ) : isDeactivated ? (
        <Flex justify="space-between" align="center" w="full" p={4} bg="red.50" borderRadius="md">
          <Text color="gray.800">Your access has been deactivated.</Text>
          <Button colorScheme="red" onClick={() => navigate({ to: "/pricing" })}>
            Reactivate Now
          </Button>
        </Flex>
      ) : (
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
                <Box key={index} p="4" borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
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
              {isFetching || loadingMore ? (
                <Text fontSize="sm" color="gray.500">Loading...</Text>
              ) : (
                continuationToken && (
                  <Button colorScheme="green" size="sm" onClick={handleLoadMore} mt={4} alignSelf="center">
                    Load More
                  </Button>
                )
              )}
            </VStack>
          </Box>
          <Box w={{ base: "100%", md: "250px" }} p="4" borderLeft={{ md: "1px solid" }} borderColor="gray.200">
            <VStack spacing="4" align="stretch">
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
      )}
    </Container>
  );
}

export default FileExplorer;