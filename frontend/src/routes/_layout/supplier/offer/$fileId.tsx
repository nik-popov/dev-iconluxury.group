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
  Icon,
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
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@chakra-ui/react";
import { FiFileText } from "react-icons/fi";
import useCustomToast from "../../../../hooks/useCustomToast";

interface OfferDetails {
  id: number;
  fileName?: string;
  fileLocationUrl: string;
  userEmail?: string;
  createTime?: string;
  recordCount: number;
  nikOfferCount: number;
  sampleRecords: RecordItem[];
  sampleNikOffers: NikOfferItem[];
}

interface RecordItem {
  entryId: number;
  excelRowId: number;
  productModel?: string;
  productBrand?: string;
  productColor?: string;
  productCategory?: string;
  excelRowImageRef?: string;
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

interface NikOffersTabProps {
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
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);

  return (
    <Box p={4} bg="white">
      <Flex justify="flex-end" mb={4}>
        <Button size="sm" onClick={() => setIsFileModalOpen(true)}>
          Offer Metadata
        </Button>
      </Flex>
      <Box mb={6}>
        <Stat mt={4}>
          <StatLabel color="gray.600">File Name</StatLabel>
          <StatHelpText wordBreak="break-all">
            <Link href={offer.fileLocationUrl} isExternal color="green.300">
              {offer.fileName || "N/A"}
            </Link>
          </StatHelpText>
        </Stat>
        <Stat mt={4}>
          <StatLabel color="gray.600">Status</StatLabel>
          <StatNumber>
            <Badge colorScheme={offer.recordCount > 0 ? "green" : "yellow"}>
              {offer.recordCount > 0 ? "Active" : "Pending"}
            </Badge>
          </StatNumber>
        </Stat>
        <Stat mt={4}>
          <StatLabel color="gray.600">Created</StatLabel>
          <StatNumber color="gray.800">
            {offer.createTime ? new Date(offer.createTime).toLocaleString() : "N/A"}
          </StatNumber>
        </Stat>
        <Stat mt={4}>
          <StatLabel color="gray.600">Total Records</StatLabel>
          <StatNumber color="gray.800">{offer.recordCount}</StatNumber>
        </Stat>
        <Stat mt={4}>
          <StatLabel color="gray.600">Nik Offers</StatLabel>
          <StatNumber color="gray.800">{offer.nikOfferCount}</StatNumber>
        </Stat>
      </Box>
      <DetailsModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        title={`Offer ${offer.id}`}
        data={{
          ID: offer.id,
          FileName: offer.fileName,
          FileLocationUrl: offer.fileLocationUrl,
          UserEmail: offer.userEmail,
          CreateTime: offer.createTime,
          RecordCount: offer.recordCount,
          NikOfferCount: offer.nikOfferCount,
        }}
      />
    </Box>
  );
};

// RecordsTab Component
const RecordsTab: React.FC<RecordsTabProps> = ({ offer, searchQuery }) => {
  const showToast = useCustomToast();
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null);
  const [displayCount, setDisplayCount] = useState(50);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const query = (searchQuery || "").trim().toLowerCase();
  const filteredRecords = offer.sampleRecords.filter((record) =>
    (record.productModel || "").toLowerCase().includes(query) ||
    (record.productBrand || "").toLowerCase().includes(query) ||
    (record.productColor || "").toLowerCase().includes(query) ||
    (record.productCategory || "").toLowerCase().includes(query) ||
    record.entryId.toString().includes(query) ||
    record.excelRowId.toString().includes(query)
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
      const aValue = a[key as keyof RecordItem] || "";
      const bValue = b[key as keyof RecordItem] || "";
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

  const hasThumbnails = sortedRecords.some((record) => record.excelRowImageRef);

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
                {hasThumbnails && <Th w="60px" color="gray.800">Image</Th>}
                <Th w="80px" onClick={() => handleSort("entryId")} cursor="pointer" color="gray.800">
                  Entry ID {sortConfig?.key === "entryId" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="80px" onClick={() => handleSort("excelRowId")} cursor="pointer" color="gray.800">
                  Excel Row ID {sortConfig?.key === "excelRowId" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("productModel")} cursor="pointer" color="gray.800">
                  Style # {sortConfig?.key === "productModel" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("productBrand")} cursor="pointer" color="gray.800">
                  Brand {sortConfig?.key === "productBrand" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("productColor")} cursor="pointer" color="gray.800">
                  Color {sortConfig?.key === "productColor" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="120px" onClick={() => handleSort("productCategory")} cursor="pointer" color="gray.800">
                  Category {sortConfig?.key === "productCategory" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="80px" color="gray.800">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {displayedRecords.map((record) => (
                <Tr key={record.entryId}>
                  {hasThumbnails && (
                    <Td w="60px">
                      {record.excelRowImageRef ? (
                        <Image
                          src={record.excelRowImageRef}
                          alt={record.productModel || "Record ID " + record.entryId}
                          maxW="80px"
                          maxH="80px"
                          objectFit="cover"
                          cursor="pointer"
                          onClick={() => record.excelRowImageRef && window.open(record.excelRowImageRef, "_blank")}
                          onError={() => showToast("Image Load Failed", `Failed to load image: ${record.excelRowImageRef}`, "warning")}
                          fallback={<Text fontSize="xs" color="gray.600">No image</Text>}
                          loading="lazy"
                        />
                      ) : (
                        <Text fontSize="xs" color="gray.600">No image</Text>
                      )}
                    </Td>
                  )}
                  <Td w="80px" color="gray.800">{record.entryId || "N/A"}</Td>
                  <Td w="80px" color="gray.800">{record.excelRowId || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.productModel || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.productBrand || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.productColor || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{record.productCategory || "N/A"}</Td>
                  <Td w="80px">
                    <Button size="xs" onClick={() => { setSelectedRecord(record); setIsRecordModalOpen(true); }}>
                      View Details
                    </Button>
                  </Td>
                </Tr>
              ))}
              {displayedRecords.length === 0 && (
                <Tr>
                  <Td colSpan={hasThumbnails ? 8 : 7} textAlign="center" color="gray.600">No records match your search query.</Td>
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
        title={`Record ${selectedRecord?.entryId || "Details"}`}
        data={selectedRecord}
      />
    </Box>
  );
};

// NikOffersTab Component
const NikOffersTab: React.FC<NikOffersTabProps> = ({ offer, searchQuery }) => {
  const showToast = useCustomToast();
  const [selectedNikOffer, setSelectedNikOffer] = useState<NikOfferItem | null>(null);
  const [isNikOfferModalOpen, setIsNikOfferModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null);
  const [displayCount, setDisplayCount] = useState(50);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const query = (searchQuery || "").trim().toLowerCase();
  const filteredNikOffers = offer.sampleNikOffers.filter((nikOffer) =>
    Object.values(nikOffer).some((value) =>
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

  const sortedNikOffers = [...filteredNikOffers].sort((a, b) => {
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

  const displayedNikOffers = sortedNikOffers.slice(0, displayCount);
  const hasMore = displayCount < sortedNikOffers.length;

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
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Nik Offers ({sortedNikOffers.length})</Text>
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
                <Th w="80px" color="gray.800">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {displayedNikOffers.map((nikOffer) => (
                <Tr key={`${nikOffer.fileId}-${nikOffer.f0}`}>
                  <Td w="80px" color="gray.800">{nikOffer.fileId || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{nikOffer.f0 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{nikOffer.f1 || "N/A"}</Td>
                  <Td w="120px" color="gray.800">{nikOffer.f2 || "N/A"}</Td>
                  <Td w="80px">
                    <Button size="xs" onClick={() => { setSelectedNikOffer(nikOffer); setIsNikOfferModalOpen(true); }}>
                      View Details
                    </Button>
                  </Td>
                </Tr>
              ))}
              {displayedNikOffers.length === 0 && (
                <Tr>
                  <Td colSpan={5} textAlign="center" color="gray.600">No Nik offers match your search query.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          {hasMore && (
            <Box ref={loadMoreRef} h="20px" textAlign="center">
              <Text fontSize="sm" color="gray.600">Loading more...</Text>
            </Box>
          )}
          {!hasMore && displayedNikOffers.length > 0 && (
            <Box h="20px" textAlign="center">
              <Text fontSize="sm" color="gray.600">No more Nik offers to load</Text>
            </Box>
          )}
        </CardBody>
      </Card>
      <DetailsModal
        isOpen={isNikOfferModalOpen}
        onClose={() => setIsNikOfferModalOpen(false)}
        title={`Nik Offer ${selectedNikOffer?.fileId || "Details"}`}
        data={selectedNikOffer}
      />
    </Box>
  );
};

// OfferDetailPage Component
const OfferDetailPage = () => {
  const { fileId } = useParams({ from: "/_layout/supplier/offer/$fileId" }) as { fileId: string };
  const searchParams = useSearch({ from: "/_layout/supplier/offer/$fileId" }) as { search?: string; activeTab?: string };
  const initialTab = searchParams.activeTab ? parseInt(searchParams.activeTab, 10) : 0;
  const initialSearch = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search || "";
  const [activeTab, setActiveTab] = useState<number>(isNaN(initialTab) || initialTab < 0 || initialTab > 2 ? 0 : initialTab);
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
    { title: "Nik Offers", component: () => <NikOffersTab offer={offerData} searchQuery={searchQuery} /> },
  ];

  return (
    <Container maxW="full" bg="white">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="gray.800">Offer: {fileId}</Text>
          <Text fontSize="sm" color="gray.600">Details for supplier offer {offerData.fileName || "ID " + offerData.id}.</Text>
        </Box>
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