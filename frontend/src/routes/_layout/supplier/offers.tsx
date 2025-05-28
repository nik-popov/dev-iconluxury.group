import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Box,
  Container,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Divider,
  Badge,
  Input,
  Flex,
  VStack,
  HStack,
  Button,
  Image,
  useToast,
  Textarea,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";
import { FiCopy, FiEye, FiEyeOff } from "react-icons/fi";
import PromoSERP from "../../../components/ComingSoon";
import ApiStatusManagement from "../../../components/UserSettings/ApiStatusManagement";

interface OfferSummary {
  id: number;
  fileName?: string; // Made optional to reflect missing name allowance
  fileLocationUrl: string;
  userEmail?: string;
  createTime?: string;
  recordCount: number;
  nikOfferCount: number;
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

interface OfferDetails {
  id: number;
  fileName?: string; // Made optional for consistency
  fileLocationUrl: string;
  userEmail?: string;
  createTime?: string;
  recordCount: number;
  nikOfferCount: number;
  sampleRecords: RecordItem[];
  sampleNikOffers: NikOfferItem[];
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  isTrial: boolean;
  isDeactivated: boolean;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token");
};

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = getAuthToken();
  const response = await fetch("https://api.iconluxury.group/api/v1/subscription-status/serp", {
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

async function fetchOffers(page: number): Promise<OfferSummary[]> {
  const token = getAuthToken();
  const response = await fetch(`https://backend-dev.iconluxury.group/api/luxurymarket/supplier/offers?page=${page}&page_size=10`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch offers: ${response.status}`);
  return response.json();
}

async function fetchOfferDetails(offerId: number): Promise<OfferDetails> {
  const token = getAuthToken();
  const response = await fetch(`https://backend-dev.iconluxury.group/api/luxurymarket/supplier/offers/${offerId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch offer details: ${response.status}`);
  return response.json();
}

const ResizeHandle = ({ onResize }: { onResize: (newWidth: number) => void }) => {
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = handleRef.current?.parentElement?.offsetWidth || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = startWidth + delta;
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const delta = e.key === "ArrowRight" ? 10 : -10;
      const currentWidth = handleRef.current?.parentElement?.offsetWidth || 400;
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.8;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, currentWidth + delta));
      onResize(newWidth);
    }
  };

  return (
    <Box
      ref={handleRef}
      w="6px"
      bg="gray.300"
      cursor="col-resize"
      _hover={{ bg: "gray.400" }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      position="absolute"
      top="0"
      bottom="0"
      left="-3px"
    />
  );
};

interface PreviewPanelProps {
  selectedOffer: OfferSummary | null;
  offerDetails: OfferDetails | null;
  isDetailsLoading: boolean;
  onCopyContent: (content: string) => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ selectedOffer, offerDetails, isDetailsLoading, onCopyContent }) => {
  if (isDetailsLoading) {
    return <Text fontSize="sm" color="gray.500">Loading offer details...</Text>;
  }

  if (!selectedOffer || !offerDetails) {
    return <Text fontSize="sm" color="gray.500">Select an offer to preview</Text>;
  }

  const previewContent = JSON.stringify(
    {
      sampleRecords: offerDetails.sampleRecords,
      sampleNikOffers: offerDetails.sampleNikOffers,
    },
    null,
    2
  );

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontWeight="bold">Offer Details</Text>
      <VStack align="start" spacing={1}>
        <Text><strong>ID:</strong> {offerDetails.id}</Text>
        <Text><strong>File Name:</strong> {offerDetails.fileName || "N/A"}</Text>
        <Text><strong>User Email:</strong> {offerDetails.userEmail || "Unknown"}</Text>
        <Text><strong>Created:</strong> {offerDetails.createTime ? new Date(offerDetails.createTime).toLocaleString() : "N/A"}</Text>
        <Text><strong>Records:</strong> {offerDetails.recordCount}</Text>
        <Text><strong>Nik Offers:</strong> {offerDetails.nikOfferCount}</Text>
      </VStack>
      {offerDetails.sampleRecords.length > 0 && (
        <>
          <Text fontWeight="bold" mt={4}>Sample Record</Text>
          {offerDetails.sampleRecords[0].excelRowImageRef && (
            <Image
              src={offerDetails.sampleRecords[0].excelRowImageRef}
              alt="Record Image"
              maxW="100%"
              maxH="20vh"
              objectFit="contain"
              borderRadius="md"
            />
          )}
          <VStack align="start" spacing={1}>
            <Text><strong>Product Model:</strong> {offerDetails.sampleRecords[0].productModel || "N/A"}</Text>
            <Text><strong>Brand:</strong> {offerDetails.sampleRecords[0].productBrand || "N/A"}</Text>
            <Text><strong>Color:</strong> {offerDetails.sampleRecords[0].productColor || "N/A"}</Text>
            <Text><strong>Category:</strong> {offerDetails.sampleRecords[0].productCategory || "N/A"}</Text>
          </VStack>
        </>
      )}
      <Text fontWeight="bold" mt={4}>Data Preview</Text>
      <Textarea
        value={previewContent}
        isReadOnly
        resize="vertical"
        minH="20vh"
        maxH="60vh"
        fontFamily="mono"
        fontSize="sm"
      />
      <HStack justify="flex-end">
        <Tooltip label="Copy Preview Content">
          <Button
            size="sm"
            colorScheme="gray"
            leftIcon={<FiCopy />}
            onClick={() => onCopyContent(previewContent)}
          >
            Copy
          </Button>
        </Tooltip>
      </HStack>
    </VStack>
  );
};

function SupplierOffers() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [offers, setOffers] = useState<OfferSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<OfferSummary | null>(null);
  const [offerDetails, setOfferDetails] = useState<OfferDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(400);

  const { data: subscriptionStatus, isLoading: isSubLoading, error: subError } = useQuery({
    queryKey: ["subscriptionStatus", "supplier"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message.includes("Unauthorized")) return false;
      return failureCount < 3;
    },
  });

  const { data: freshOffers, isFetching } = useQuery({
    queryKey: ["supplierOffers", page],
    queryFn: () => fetchOffers(page),
    placeholderData: keepPreviousData,
    enabled: !!subscriptionStatus?.hasSubscription || !!subscriptionStatus?.isTrial,
  });

  useEffect(() => {
    if (freshOffers) {
      setOffers((prev) => {
        const newOffers = page === 1 ? freshOffers : [...prev, ...freshOffers];
        const uniqueOffers = Array.from(
          new Map(newOffers.map((offer) => [offer.id, offer])).values()
        );
        return uniqueOffers;
      });
    }
  }, [freshOffers, page]);

  const handleOfferClick = async (offer: OfferSummary) => {
    setSelectedOffer(offer);
    setIsDetailsLoading(true);
    try {
      const details = await fetchOfferDetails(offer.id);
      setOfferDetails(details);
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message || "Unable to load offer details",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setOfferDetails(null);
    } finally {
      setIsDetailsLoading(false);
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

  const filteredOffers = searchQuery
    ? offers.filter((offer) =>
        offer.fileName
          ? offer.fileName.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
    : offers;

  const handleLoadMore = () => setPage((prev) => prev + 1);

  const getStatusColor = (recordCount: number) => {
    return recordCount > 0 ? "green" : "yellow";
  };

  if (isSubLoading) {
    return (
      <Container maxW="full" bg="white" color="gray.800">
        <Text>Loading your data...</Text>
      </Container>
    );
  }

  if (subError) {
    return (
      <Container maxW="full" bg="white" color="gray.800">
        <Text color="red.500">
          {subError.message === "Unauthorized: Please log in again."
            ? "Session expired. Please log in again."
            : "Error loading status. Please try again later."}
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
  const isFullyDeactivated = isDeactivated && !hasSubscription;

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="gray.800">Supplier Offers</Text>
          <Text fontSize="sm" color="gray.600">View and manage supplier offers</Text>
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
        </HStack>
      </Flex>

      <Divider my={4} borderColor="gray.200" />

      {isLocked ? (
        <PromoSERP />
      ) : isFullyDeactivated ? (
        <Flex justify="space-between" align="center" w="full" p={4} bg="red.50" borderRadius="md">
          <Text color="gray.800">Your tools have been deactivated.</Text>
          <Button colorScheme="red" onClick={() => navigate({ to: "/proxies/pricing" })}>
            Reactivate Now
          </Button>
        </Flex>
      ) : (
        <Flex gap={6} justify="space-between" align="stretch" wrap="wrap">
          <Box flex="1" minW={{ base: "100%", md: "65%" }} maxH="70vh" overflowY="auto">
            <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
              <Input
                placeholder="Search Offers by File Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                w={{ base: "100%", md: "250px" }}
                borderColor="green.300"
                _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
                _hover={{ borderColor: "green.400" }}
                bg="white"
                color="gray.800"
                _placeholder={{ color: "gray.500" }}
                borderRadius="md"
              />
            </Flex>
            <Box>
              <Text fontSize="md" fontWeight="bold" color="gray.800" mb={2}>
                All Offers
              </Text>
              <TableContainer
                p={3}
                shadow="sm"
                borderWidth="1px"
                borderRadius="md"
                bg="white"
                borderColor="gray.200"
              >
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Offer ID</Th>
                      <Th>File Name</Th>
                      <Th>User Email</Th>
                      <Th>Created</Th>
                      <Th>Records</Th>
                      <Th>Nik Offers</Th>
                      <Th>Status</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {isFetching && page === 1 ? (
                      <Tr>
                        <Td colSpan={8} textAlign="center">
                          <Text fontSize="sm" color="gray.600">Loading...</Text>
                        </Td>
                      </Tr>
                    ) : filteredOffers.length === 0 ? (
                      <Tr>
                        <Td colSpan={8} textAlign="center">
                          <Text fontSize="sm" color="gray.600">No offers found.</Text>
                        </Td>
                      </Tr>
                    ) : (
                      filteredOffers.map((offer) => (
                        <Tr
                          key={offer.id}
                          cursor="pointer"
                          _hover={{ bg: "gray.50" }}
                          onClick={() => handleOfferClick(offer)}
                          bg={selectedOffer?.id === offer.id ? "green.50" : "white"}
                        >
                          <Td>{offer.id}</Td>
                          <Td>{offer.fileName || "N/A"}</Td>
                          <Td>{offer.userEmail || "Unknown"}</Td>
                          <Td>{offer.createTime ? new Date(offer.createTime).toLocaleString() : "N/A"}</Td>
                          <Td>{offer.recordCount}</Td>
                          <Td>{offer.nikOfferCount}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(offer.recordCount)}>
                              {offer.recordCount > 0 ? "Active" : "Pending"}
                            </Badge>
                          </Td>
                          <Td>
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate({
                                  to: "/supplier/offers/$offerId",
                                  params: { offerId: offer.id.toString() },
                                });
                              }}
                            >
                              View Details
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
              {filteredOffers.length > 0 && (
                <Button
                  colorScheme="green"
                  size="sm"
                  onClick={handleLoadMore}
                  mt={4}
                  alignSelf="center"
                  isLoading={isFetching}
                >
                  Load More
                </Button>
              )}
            </Box>
          </Box>

          {isPreviewOpen && (
            <Box
              w={{ base: "100%", md: `${previewWidth}px` }}
              p="4"
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
              <PreviewPanel
                selectedOffer={selectedOffer}
                offerDetails={offerDetails}
                isDetailsLoading={isDetailsLoading}
                onCopyContent={handleCopyContent}
              />
            </Box>
          )}
        </Flex>
      )}
    </Container>
  );
}

export const Route = createFileRoute("/_layout/supplier/offers")({
  component: SupplierOffers,
});

export default SupplierOffers;