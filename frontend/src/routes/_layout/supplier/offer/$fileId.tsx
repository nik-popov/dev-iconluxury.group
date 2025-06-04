//supplier/offer/$fileId.tsx
import React, { useState, useEffect, useRef } from "react";
import { useSearch } from "@tanstack/react-router";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query"; // Added useMutation and useQueryClient
import {
  Container,
  Box,
  Text,
  Flex,
  Tabs,
  TabList,
  Input,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Button,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link,
} from "@chakra-ui/react";
import useCustomToast from "../../../../hooks/useCustomToast";

interface OfferDetails {
  id: number;
  fileName?: string;
  fileLocationUrl: string;
  userEmail?: string;
  createTime?: string;
  recordCount: number;
  nikOfferCount: number;
  sampleNikOffers: NikOfferItem[];
  // Add a status field if your API returns it, e.g., for the badge
  status?: string; // Example: "Pending Review", "Approved", "Uploaded"
}

interface NikOfferItem {
  fileId: number;
  f0?: string;
  f1?: string;
  f2?: string;
  f3?: string;
  f4?: string;
  f5?: string;
  f6?: string;
  f7?: string;
  f8?: string;
  f9?: string;
}

interface RecordsTabProps {
  offer: OfferDetails;
  searchQuery: string;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token");
};

async function fetchOfferDetails(fileId: string): Promise<OfferDetails> {
  const token = getAuthToken();
  const response = await fetch(`https://backend-dev.iconluxury.group/api/luxurymarket/supplier/offers/${fileId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch offer details: ${response.status}`);
  return response.json();
}

// Updated function to submit to the new 'offersubmit' endpoint
async function submitOfferForReviewApi(fileId: string): Promise<{ message: string }> { // Expecting a message on success
  const token = getAuthToken();
  const payload = { fileId: parseInt(fileId, 10) }; // API likely expects integer fileId

  const response = await fetch(`https://backend-dev.iconluxury.group/api/luxurymarket/supplier/offersubmit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json(); // Try to parse JSON for both success and error

  if (!response.ok) {
    const errorMessage = responseBody?.message || responseBody?.detail || `Failed to submit: ${response.status}`;
    throw new Error(errorMessage);
  }
  return responseBody; // Assuming success returns something like { message: "Successfully submitted" }
}

// OverviewTab Component
const OverviewTab: React.FC<{ offer: OfferDetails }> = ({ offer }) => {
  // Determine badge color and text based on offer status or record count
  let badgeColorScheme = "yellow";
  let badgeText = offer.status || "Pending Data"; // Use API status if available

  if (!offer.status) { // Fallback logic if status is not in API response
    if (offer.recordCount > 0 && offer.nikOfferCount > 0) {
        badgeColorScheme = "blue";
        badgeText = "Processed";
    } else if (offer.recordCount > 0) {
        badgeColorScheme = "orange";
        badgeText = "Partially Processed";
    }
  } else {
     // Map API status to badge colors if needed
     if (offer.status === "Submitted for Review") badgeColorScheme = "purple";
     else if (offer.status === "Approved") badgeColorScheme = "green";
     // Add more status mappings as needed
  }


  return (
    <Box p={4} bg="white">
      <Box mb={6}>
        <Stat mt={4}>
          <StatLabel color="gray.600">Status</StatLabel>
          <StatNumber>
            <Badge colorScheme={badgeColorScheme} px={2} py={1} borderRadius="md">
              {badgeText}
            </Badge>
          </StatNumber>
        </Stat>
      </Box>
      <Text fontSize="lg" fontWeight="bold" mb={4}>Metadata</Text>
      <Table variant="simple" size="md" colorScheme="gray" mb={6}>
        <Tbody>
          <Tr>
            <Td fontWeight="semibold" color="gray.700">ID</Td>
            <Td>{offer.id}</Td>
          </Tr>
          <Tr>
            <Td fontWeight="semibold" color="gray.700">File Name</Td>
            <Td>
              <Link href={offer.fileLocationUrl} isExternal color="blue.500" _hover={{ textDecoration: "underline" }}>
                {offer.fileName || "N/A"}
              </Link>
            </Td>
          </Tr>
          <Tr>
            <Td fontWeight="semibold" color="gray.700">File Location URL</Td>
            <Td>
              <Link href={offer.fileLocationUrl} color="blue.500" isExternal _hover={{ textDecoration: "underline" }}>
                View File
              </Link>
            </Td>
          </Tr>
          <Tr>
            <Td fontWeight="semibold" color="gray.700">User Email</Td>
            <Td>{offer.userEmail || "N/A"}</Td>
          </Tr>
          <Tr>
            <Td fontWeight="semibold" color="gray.700">Create Time</Td>
            <Td>{offer.createTime ? new Date(offer.createTime).toLocaleString() : "N/A"}</Td>
          </Tr>
          <Tr>
            <Td fontWeight="semibold" color="gray.700">ImageScraperRecords Count</Td>
            <Td>{offer.recordCount}</Td>
          </Tr>
          <Tr>
            <Td fontWeight="semibold" color="gray.700">NikOfferLoadInitial Count</Td>
            <Td>{offer.nikOfferCount}</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
};

// RecordsTab Component (NikOffer Records)
const RecordsTab: React.FC<RecordsTabProps> = ({ offer, searchQuery }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null);
  const [displayCount, setDisplayCount] = useState(50);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const query = (searchQuery || "").trim().toLowerCase();
  const filteredRecords = offer.sampleNikOffers.filter((record) =>
    Object.values(record).some((value) => value?.toString().toLowerCase().includes(query))
  );

  const handleSort = (key: keyof NikOfferItem) => { // Typed key
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === "ascending" ? "descending" : "ascending" };
      }
      return { key, direction: "ascending" };
    });
  };

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortConfig) {
      const { key, direction } = sortConfig;
      const aValue = a[key as keyof NikOfferItem] ?? ""; // Use "?? ''" for null/undefined to string
      const bValue = b[key as keyof NikOfferItem] ?? ""; // Use "?? ''"
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "ascending" ? aValue - bValue : bValue - aValue;
      }
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return direction === "ascending" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    }
    return 0;
  });

  const displayedRecords = sortedRecords.slice(0, displayCount);
  const hasMore = displayCount < sortedRecords.length;

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    const currentLoadMoreRef = loadMoreRef.current; // Capture ref value

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => prev + 50);
        }
      },
      { threshold: 0.1, rootMargin: "200px" } // Trigger when 200px from viewport
    );

    observerRef.current.observe(currentLoadMoreRef);

    return () => {
      if (observerRef.current && currentLoadMoreRef) {
        observerRef.current.unobserve(currentLoadMoreRef);
      }
    };
  }, [hasMore, displayedRecords]); // Re-run if displayedRecords changes (ensures observer is attached after render)

  const headers: { key: keyof NikOfferItem; label: string; width?: string }[] = [
    { key: "fileId", label: "File ID", width: "80px" },
    { key: "f0", label: "Field 0", width: "120px" },
    { key: "f1", label: "Field 1", width: "120px" },
    { key: "f2", label: "Field 2", width: "120px" },
    { key: "f3", label: "Field 3", width: "120px" },
    { key: "f4", label: "Field 4", width: "120px" },
    { key: "f5", label: "Field 5", width: "120px" },
    { key: "f6", label: "Field 6", width: "120px" },
    { key: "f7", label: "Field 7", width: "120px" },
    { key: "f8", label: "Field 8", width: "120px" },
    { key: "f9", label: "Field 9", width: "120px" },
  ];

  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Records ({sortedRecords.length})</Text>
      </Flex>
      <Card shadow="md" borderWidth="1px" bg="white" overflowX="auto">
        <CardBody p={0}> {/* Remove padding for full width table */}
          <Table variant="simple" size="sm" colorScheme="gray">
            <Thead bg="gray.50">
              <Tr>
                {headers.map(header => (
                  <Th 
                    key={header.key} 
                    w={header.width} 
                    onClick={() => handleSort(header.key)} 
                    cursor="pointer" 
                    color="gray.600"
                    py={3}
                    borderBottomWidth="2px"
                    borderColor="gray.200"
                    _hover={{ bg: "gray.100" }}
                  >
                    {header.label} {sortConfig?.key === header.key && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {displayedRecords.map((record, index) => (
                <Tr key={`${record.fileId}-${record.f0}-${index}`} _hover={{ bg: "gray.50" }}>
                  {headers.map(header => (
                     <Td key={header.key} w={header.width} color="gray.700" borderColor="gray.200">
                       {String(record[header.key as keyof NikOfferItem] ?? "N/A")}
                     </Td>
                  ))}
                </Tr>
              ))}
              {displayedRecords.length === 0 && (
                <Tr>
                  <Td colSpan={headers.length} textAlign="center" color="gray.600" py={10}>
                    No records match your search query or no records available.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          {hasMore && (
            <Box ref={loadMoreRef} h="40px" display="flex" alignItems="center" justifyContent="center">
              <Spinner size="sm" color="blue.500" />
              <Text fontSize="sm" color="gray.600" ml={2}>Loading more...</Text>
            </Box>
          )}
          {!hasMore && displayedRecords.length > 0 && (
            <Box h="40px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="sm" color="gray.500">End of records</Text>
            </Box>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};

// OfferDetailPage Component
const OfferDetailPage = () => {
  const { fileId = "" } = useParams({ from: "/_layout/supplier/offer/$fileId" }); // Ensure fileId is always a string
  interface SearchParams {
    activeTab?: string;
    search?: string | string[];
  }
  const searchParams = useSearch({ from: "/_layout/supplier/offer/$fileId" }) as SearchParams;
  const initialTab = searchParams.activeTab ? parseInt(searchParams.activeTab, 10) : 0;
  const initialSearch = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search || "";
  const [activeTab, setActiveTab] = useState<number>(
    isNaN(initialTab) || initialTab < 0 || initialTab > 1 ? 0 : initialTab
  );
  const [searchQuery, setSearchQuery] = useState<string>(String(initialSearch));
  const showToast = useCustomToast();
  const queryClient = useQueryClient();

  const { data: offerData, isLoading, error, isFetching } = useQuery({
    queryKey: ["offerDetails", fileId],
    queryFn: () => fetchOfferDetails(fileId),
    enabled: !!fileId, // Only run if fileId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Unauthorized")) return false;
      return failureCount < 2; // Retry twice
    },
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: () => submitOfferForReviewApi(fileId),
    onSuccess: (data) => {
      showToast("Success", data.message || "Offer submitted for review successfully.", "success");
      // Invalidate and refetch offer details to update status
      queryClient.invalidateQueries({ queryKey: ["offerDetails", fileId] });
      queryClient.invalidateQueries({ queryKey: ["supplierOffers"] }); // If you have a list query
    },
    onError: (error) => {
      showToast("Error", `Failed to submit: ${error.message}`, "error");
    },
  });

  const handleSubmitForReview = () => {
    if (!fileId) {
        showToast("Error", "File ID is missing.", "error");
        return;
    }
    mutation.mutate();
  };

  if (isLoading && !offerData) { // Initial loading state
    return (
      <Container maxW="full" py={6} bg="white">
        <Flex justify="center" align="center" h="calc(100vh - 200px)">
          <Spinner size="xl" color="blue.500" thickness="4px" />
        </Flex>
      </Container>
    );
  }

  if (error && !offerData) { // Error and no data (even placeholder)
    return (
      <Container maxW="full" py={6} bg="white">
        <Box textAlign="center" py={10}>
            <Text fontSize="xl" color="red.500" mb={2}>Error loading offer details.</Text>
            <Text color="gray.600">{error?.message || "An unknown error occurred."}</Text>
            <Button mt={4} colorScheme="blue" onClick={() => queryClient.refetchQueries({ queryKey: ["offerDetails", fileId] })}>
                Retry
            </Button>
        </Box>
      </Container>
    );
  }
  
  if (!offerData) { // Should ideally be caught by isLoading or error, but as a fallback
    return (
      <Container maxW="full" py={6} bg="white">
          <Text>No offer data available.</Text>
      </Container>
    );
  }

  const tabsConfig = [
    { title: "Overview", component: () => <OverviewTab offer={offerData} /> },
    { title: "Records", component: () => <RecordsTab offer={offerData} searchQuery={searchQuery} /> },
  ];

  return (
    <Container maxW="full" bg="gray.50" minH="100vh">
      <Box bg="white" shadow="sm">
        <Flex 
            maxW="container.xl" 
            mx="auto" 
            px={{ base: 4, md: 6 }} 
            align="center" 
            justify="space-between" 
            py={5} 
            flexWrap="wrap" 
            gap={4}
        >
            <Box textAlign="left" flex="1">
            <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="gray.800" noOfLines={1}>
                Offer: {offerData.fileName || `ID ${offerData.id}`}
            </Text>
            <Text fontSize="sm" color="gray.500">
                Details for supplier offer. {(isFetching && isLoading) && <Spinner size="xs" ml={2} />}
            </Text>
            </Box>
            <Button 
                colorScheme="blue" 
                onClick={handleSubmitForReview}
                isLoading={mutation.isPending}
                isDisabled={mutation.isPending}
            >
            Submit for Review
            </Button>
        </Flex>
      </Box>
      <Tabs
        isLazy
        index={activeTab}
        onChange={(index) => setActiveTab(index)}
        colorScheme="blue"
        variant="line"
        pt={1} 
        bg="white"
        maxW="container.xl" 
        mx="auto"
        mt={4}
        borderRadius="md"
        shadow="sm"
        overflow="hidden"
      >
        <TabList borderBottomWidth="1px" borderColor="gray.200" px={{ base: 2, md: 4 }}>
          {tabsConfig.map((tab) => (
            <Tab
              key={tab.title}
              fontWeight="semibold"
              _selected={{ color: "blue.600", borderColor: "blue.600" }}
              color="gray.600"
              py={4}
              mr={2}
            >
              {tab.title}
            </Tab>
          ))}
          {activeTab === 1 && ( // Show search only for Records tab
            <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                width={{ base: "100%", md: "300px" }}
                borderColor="gray.300"
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                color="gray.800"
                bg="white"
                ml="auto"
                size="sm"
                my={{ base: 2, md: "auto" }} // Adjust margin for mobile
            />
          )}
        </TabList>
        <TabPanels>
          {tabsConfig.map((tab, index) => (
            <TabPanel key={tab.title} px={{ base: 2, md: 4 }} py={4}>
                {activeTab === index && tab.component()} {/* Render only active tab content with isLazy */}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export const Route = createFileRoute("/_layout/supplier/offer/$fileId")({
  component: OfferDetailPage,
  validateSearch: (search: Record<string, unknown>): { activeTab?: string; search?: string | string[] } => ({ // Ensure return type matches SearchParams expectation
    activeTab: search.activeTab as string | undefined,
    search: search.search as string | string[] | undefined, // Keep as potentially string[] for flexibility
  }),
});

export default OfferDetailPage;
