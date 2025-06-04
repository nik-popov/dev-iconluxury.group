import React, { useState, useEffect, useRef } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
  Link,
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
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

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any> | null;
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

async function submitForReview(fileId: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`https://backend-dev.iconluxury.group/api/luxurymarket/supplier/offers/${fileId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) throw new Error(`Failed to submit for review: ${response.status}`);
}

// DetailsModal Component
const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, title, data }) => {
  const capitalizeKey = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();

  const renderValue = (value: any) => {
    if (value === null || value === undefined) return <Text color="gray.400">N/A</Text>;
    if (typeof value === "string" && /^(https?:\/\/[^\s]+)$/.test(value)) {
      return <Link href={value} color="blue.500" isExternal>{value}</Link>;
    }
    return <Text>{value}</Text>;
  };

  if (!data) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent maxW="90vw" maxH="70vh" mx="auto" my={4}>
          <ModalHeader fontSize="xl" fontWeight="bold">{title}</ModalHeader>
          <ModalBody><Text fontSize="md" color="gray.600">No data available</Text></ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const modalTitle = data.id ? `${title} (ID: ${data.id})` : title;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalOverlay />
      <ModalContent maxW="90vw" maxH="80vh" mx="auto" my={4} borderRadius="md">
        <ModalHeader fontSize="xl" fontWeight="bold" pb={2}>{modalTitle}</ModalHeader>
        <ModalBody overflowY="auto">
          <Table variant="simple" size="md" colorScheme="gray">
            <Tbody>
              {Object.entries(data).filter(([key]) => key.toLowerCase() !== "id").map(([key, value]) => (
                <Tr key={key}>
                  <Td fontWeight="semibold" color="gray.700" w="25%" py={3}>{capitalizeKey(key)}</Td>
                  <Td wordBreak="break-word" color="gray.800" py={3}>{renderValue(value)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// OverviewTab Component
const OverviewTab: React.FC<{ offer: OfferDetails }> = ({ offer }) => {
  return (
    <Box p={4} bg="white">
      <Text fontSize="lg" fontWeight="bold" mb={4}>Metadata</Text>
      <Box mb={6}>
        <Stat mt={4}>
          <StatLabel color="gray.600">Status</StatLabel>
          <StatNumber>
            <Badge colorScheme={offer.recordCount > 0 ? "green" : "yellow"}>
              {offer.recordCount > 0 ? "Active" : "Pending"}
            </Badge>
          </StatNumber>
        </Stat>
        <Stat mt={4}>
          <StatLabel color="gray.600">Records</StatLabel>
          <StatNumber color="gray.800">{offer.nikOfferCount}</StatNumber>
        </Stat>
      </Box>
    </Box>
  );
};

// RecordsTab Component (formerly NikOffersTab)
const RecordsTab: React.FC<RecordsTabProps> = ({ offer, searchQuery }) => {
  const showToast = useCustomToast();
  const [selectedRecord, setSelectedRecord] = useState<NikOfferItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null);
  const [displayCount, setDisplayCount] = useState(50);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const query = (searchQuery || "").trim().toLowerCase();
  const filteredRecords = offer.sampleNikOffers.filter((record) =>
    Object.values(record).some((value) =>
      value?.toString().toLowerCase().includes(query)
    )
  );

  const handleSort = (key: string) => {
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
      const aValue = a[key as keyof NikOfferItem] || "";
      const bValue = b[key as keyof NikOfferItem] || "";
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

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => prev + 50);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current && loadMoreRef.current) {
        observerRef.current.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore]);

  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Records ({sortedRecords.length})</Text>
      </Flex>
      <Card shadow="md" borderWidth="1px" bg="white">
        <CardBody>
          <Table variant="simple" size="sm" colorScheme="blue">
            <Thead bg="gray.100">
              <Tr>
                <Th w="80px" onClick={() => handleSort("fileId")} cursor="pointer" color="gray.800">
                  File ID {sortConfig?.key === "fileId" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f0")} cursor="pointer" color="gray.800">
                  Field 0 {sortConfig?.key === "f0" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f1")} cursor="pointer" color="gray.800">
                  Field 1 {sortConfig?.key === "f1" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f2")} cursor="pointer" color="gray.800">
                  Field 2 {sortConfig?.key === "f2" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f3")} cursor="pointer" color="gray.800">
                  Field 3 {sortConfig?.key === "f3" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f4")} cursor="pointer" color="gray.800">
                  Field 4 {sortConfig?.key === "f4" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f5")} cursor="pointer" color="gray.800">
                  Field 5 {sortConfig?.key === "f5" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f6")} cursor="pointer" color="gray.800">
                  Field 6 {sortConfig?.key === "f6" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f7")} cursor="pointer" color="gray.800">
                  Field 7 {sortConfig?.key === "f7" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f8")} cursor="pointer" color="gray.800">
                  Field 8 {sortConfig?.key === "f8" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("f9")} cursor="pointer" color="gray.800">
                  Field 9 {sortConfig?.key === "f9" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {displayedRecords.map((record) => (
                <Tr key={`${record.fileId}-${record.f0}`}>
                  <Td w="80px" color="gray.800">{record.fileId || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f0 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f1 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f2 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f3 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f4 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f5 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f6 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f7 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f8 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.f9 || "N/A"}</Td>
                </Tr>
              ))}
              {displayedRecords.length === 0 && (
                <Tr>
                  <Td colSpan={11} textAlign="center" color="gray.600">No records match your search query.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          {hasMore && (
            <Box ref={loadMoreRef} h="20px" textAlign="center">
              <Text fontSize="sm" color="gray.600">Loading more...</Text>
            </Box>
          )}
          {!hasMore && displayedRecords.length > 0 && (
            <Box h="20px" textAlign="center">
              <Text fontSize="sm" color="gray.600">No more records to load</Text>
            </Box>
          )}
        </CardBody>
      </Card>
      <DetailsModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={`Record ${selectedRecord?.fileId || "Details"}`}
        data={selectedRecord}
      />
    </Box>
  );
};

// OfferDetailPage Component
const OfferDetailPage = () => {
  const { fileId } = useParams({ from: "/_layout/supplier/offer/$fileId" });
  const { search: searchParams } = useSearch({ from: "/_layout/supplier/offer/$fileId" });
  const initialTab = searchParams.activeTab ? parseInt(searchParams.activeTab, 10) : 0;
  const initialSearch = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search || "";
  const [activeTab, setActiveTab] = useState<number>(isNaN(initialTab) || initialTab < 0 || initialTab > 1 ? 0 : initialTab);
  const [searchQuery, setSearchQuery] = useState<string>(String(initialSearch));
  const showToast = useCustomToast();

  const { data: offerData, isLoading, error } = useQuery({
    queryKey: ["offerDetails", fileId],
    queryFn: () => fetchOfferDetails(fileId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message.includes("Unauthorized")) return false;
      return failureCount < 3;
    },
    placeholderData: keepPreviousData,
  });

  const handleSubmitForReview = async () => {
    try {
      await submitForReview(fileId);
      showToast("Success", "Offer submitted for review", "success");
    } catch (error) {
      showToast("Error", "Failed to submit offer for review", "error");
    }
  };

  if (isLoading) {
    return (
      <Container maxW="full" py={6} bg="white">
        <Flex justify="center" align="center" h="200px"><Spinner size="xl" color="green.300" /></Flex>
      </Container>
    );
  }

  if (error || !offerData) {
    return (
      <Container maxW="full" py={6} bg="white">
        <Text color="red.500">{error?.message || "Offer data not available"}</Text>
      </Container>
    );
  }

  const tabsConfig = [
    { title: "Overview", component: () => <OverviewTab offer={offerData} /> },
    { title: "Records", component: () => <RecordsTab offer={offerData} searchQuery={searchQuery} /> },
  ];

  return (
    <Container maxW="full" bg="white">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="gray.800">Offer: {fileId}</Text>
          <Text fontSize="sm" color="gray.600">Details for supplier offer {offerData.fileName || "ID " + offerData.id}.</Text>
        </Box>
        <Button colorScheme="blue" onClick={handleSubmitForReview}>Submit for Review</Button>
      </Flex>
      <Tabs variant="enclosed" isLazy index={activeTab} onChange={(index) => setActiveTab(index)} colorScheme="blue">
        <TabList borderBottom="2px solid" borderColor="green.200">
          {tabsConfig.map((tab) => (
            <Tab key={tab.title} _selected={{ bg: "white", color: "green.300", borderColor: "green.300" }} color="gray.600">{tab.title}</Tab>
          ))}
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            width="300px"
            borderColor="green.300"
            _focus={{ borderColor: "green.300" }}
            color="gray.800"
            bg="white"
            ml="auto"
          />
        </TabList>
        <TabPanels>{tabsConfig.map((tab) => <TabPanel key={tab.title}>{tab.component()}</TabPanel>)}</TabPanels>
      </Tabs>
    </Container>
  );
};

export const Route = createFileRoute("/_layout/supplier/offer/$fileId")({
  component: OfferDetailPage,
});

export default OfferDetailPage;