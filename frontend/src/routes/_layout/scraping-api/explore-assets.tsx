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

// Explicit AWS SDK v3 imports
import { S3Client } from "@aws-sdk/client-s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Log imports to debug module resolution
console.log("AWS SDK imports:", { S3Client, ListObjectsV2Command, GetObjectCommand, getSignedUrl });

// Configuration for Cloudflare R2
const S3_BUCKET = process.env.REACT_APP_R2_BUCKET || "iconluxurygroup";
const REGION = "auto";
const ENDPOINT = process.env.REACT_APP_R2_ENDPOINT || "https://aa2f6aae69e7fb4bd8e2cd4311c411cb.r2.cloudflarestorage.com";
const API_URL = process.env.REACT_APP_API_URL || "https://api.iconluxury.group";

// Validate environment variables
const missingEnvVars = [
  !process.env.REACT_APP_R2_BUCKET && "REACT_APP_R2_BUCKET",
  !process.env.REACT_APP_R2_ENDPOINT && "REACT_APP_R2_ENDPOINT",
  !process.env.REACT_APP_R2_ACCESS_KEY_ID && "REACT_APP_R2_ACCESS_KEY_ID",
  !process.env.REACT_APP_R2_SECRET_ACCESS_KEY && "REACT_APP_R2_SECRET_ACCESS_KEY",
  !process.env.REACT_APP_API_URL && "REACT_APP_API_URL",
].filter(Boolean);
if (missingEnvVars.length > 0) {
  console.error("Missing environment variables:", missingEnvVars.join(", "));
  throw new Error(`Missing environment variables: ${missingEnvVars.join(", ")}`);
}

// Initialize S3 client
let s3Client: S3Client;
try {
  s3Client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.REACT_APP_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.REACT_APP_R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  console.log("S3Client initialized successfully");
} catch (error) {
  console.error("Failed to initialize S3Client:", error);
  throw new Error("Failed to initialize S3 client");
}

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

// Utility functions
const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem("access_token");
  } catch (error) {
    console.error("Error accessing localStorage:", error);
    return null;
  }
};

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = getAuthToken();
  try {
    const response = await fetch(`${API_URL}/api/v1/subscription-status/s3`, {
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
    return await response.json();
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    throw error;
  }
}

async function listS3Objects(prefix = "", continuationToken?: string): Promise<S3ListResponse> {
  if (!s3Client) {
    console.error("S3Client is not initialized");
    throw new Error("S3 client not initialized");
  }
  try {
    console.log("Listing S3 objects with prefix:", prefix, "token:", continuationToken);
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
      Delimiter: "/",
      ContinuationToken: continuationToken,
    });
    const data = await s3Client.send(command);
    if (!data) {
      console.error("No data returned from S3");
      throw new Error("No data returned from S3");
    }
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
    console.log("S3 objects listed:", { folders, files });
    return { folders, files, nextToken: data.NextContinuationToken };
  } catch (error) {
    console.error("Error listing S3 objects:", error);
    throw new Error("Failed to list S3 objects");
  }
}

async function getDownloadUrl(key: string): Promise<string> {
  if (!s3Client) {
    console.error("S3Client is not initialized");
    throw new Error("S3 client not initialized");
  }
  try {
    console.log("Generating download URL for key:", key);
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log("Download URL generated:", url);
    return url;
  } catch (error) {
    console.error("Error generating download URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

export const Route = createFileRoute("/_layout/scraping-api/explore-assets")({
  component: FileExplorerWithErrorBoundary,
});

function FileExplorer(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "file">("all");
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const { data: subscriptionStatus, isLoading: isSubLoading, error: subError } = useQuery<
    SubscriptionStatus,
    Error
  >({
    queryKey: ["subscriptionStatus", "s3"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount: number, error: Error) =>
      error.message.includes("Unauthorized") ? false : failureCount < 3,
  });

  const { data, isFetching, error: s3Error } = useQuery<S3ListResponse, Error>({
    queryKey: ["s3Objects", currentPath],
    queryFn: () => listS3Objects(currentPath),
    placeholderData: keepPreviousData,
    enabled: !!subscriptionStatus?.hasSubscription || !!subscriptionStatus?.isTrial,
  });

  useEffect(() => {
    if (data) {
      const typedData = data as S3ListResponse;
      setObjects((prev) =>
        continuationToken
          ? [...prev, ...[...typedData.folders, ...typedData.files]]
          : [...typedData.folders, ...typedData.files]
      );
      setContinuationToken(typedData.nextToken);
    }
  }, [data, continuationToken]);

  const handleFolderClick = (path: string): void => {
    setCurrentPath(path);
    setObjects([]);
    setContinuationToken(undefined);
  };

  const handleGoBack = (): void => {
    const parentPath = currentPath.split("/").slice(0, -2).join("/") + "/";
    setCurrentPath(parentPath);
    setObjects([]);
    setContinuationToken(undefined);
  };

  const handleDownload = async (key: string): Promise<void> => {
    try {
      const url = await getDownloadUrl(key);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: (error as Error).message || "Unable to generate download URL",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLoadMore = async (): Promise<void> => {
    if (continuationToken && !loadingMore) {
      setLoadingMore(true);
      try {
        const moreData = await listS3Objects(currentPath, continuationToken);
        setObjects((prev) => [...prev, ...[...moreData.folders, ...moreData.files]]);
        setContinuationToken(moreData.nextToken);
      } catch (error) {
        console.error("Load more error:", error);
        toast({
          title: "Load More Failed",
          description: (error as Error).message || "Unable to load more items",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const filteredObjects: S3Object[] = objects.filter((obj) => {
    const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || obj.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isSubLoading) {
    return (
      <Container maxW="full" bg="white" color="gray.800" py={6}>
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (subError) {
    return (
      <Container maxW="full" bg="white" color="gray.800" py={6}>
        <Text color="red.500">
          {subError.message.includes("Unauthorized")
            ? "Session expired. Please log in again."
            : "Error loading subscription status"}
        </Text>
        {subError.message.includes("Unauthorized") && (
          <Button mt={4} colorScheme="blue" onClick={() => navigate({ to: "/login" })}>
            Log In
          </Button>
        )}
      </Container>
    );
  }

  if (s3Error) {
    return (
      <Container maxW="full" bg="white" color="gray.800" py={6}>
        <Text color="red.500">Error loading files: {s3Error.message}</Text>
      </Container>
    );
  }

  const { hasSubscription = false, isTrial = false, isDeactivated = false } = (subscriptionStatus ||
    {}) as SubscriptionStatus;
  const isLocked: boolean = !hasSubscription && !isTrial;

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
              {isFetching || loadingMore ? (
                <Text fontSize="sm" color="gray.500">Loading...</Text>
              ) : (
                continuationToken && (
                  <Button
                    colorScheme="green"
                    size="sm"
                    onClick={handleLoadMore}
                    mt={4}
                    alignSelf="center"
                    isLoading={loadingMore}
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
      )}
    </Container>
  );
}

// Error boundary to catch runtime errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxW="full" bg="white" color="gray.800" py={6}>
          <Text color="red.500">
            Error: {this.state.error?.message || "Something went wrong"}
          </Text>
        </Container>
      );
    }
    return this.props.children;
  }
}

export default function FileExplorerWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <FileExplorer />
    </ErrorBoundary>
  );
}