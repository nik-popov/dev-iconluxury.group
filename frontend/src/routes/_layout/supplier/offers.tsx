import React, { useState, useEffect, useRef } from "react";
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
  useToast,
  Textarea,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";
import { FiCopy, FiEye, FiEyeOff } from "react-icons/fi";
import PromoSERP from "../../../components/ComingSoon";
import ApiStatusManagement from "../../../components/UserSettings/ApiStatusManagement";

interface SupplierOffer {
  id: number;
  title: string;
  status: "active" | "inactive" | "pending";
  supplier: string;
  price: number;
  quantity: number;
  description?: string; // Optional field for preview
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
  const response = await fetch("https://api.iconluxury.group/api/v1/subscription-status/supplier", {
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

async function fetchOffers(page: number): Promise<SupplierOffer[]> {
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

async function fetchOfferContent(offerId: number): Promise<string> {
  const token = getAuthToken();
  const response = await fetch(`https://backend-dev.iconluxury.group/api/luxurymarket/supplier/offers${offerId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch offer content: ${response.status}`);
  const data = await response.json();
  return data.description || "No detailed description available.";
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

interface PreviewPanelProps {
  selectedOffer: SupplierOffer | null;
  previewContent: string;
  onCopyContent: (content: string) => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ selectedOffer, previewContent, onCopyContent }) => {
  if (!selectedOffer) {
    return <Text fontSize="sm" color="gray.500">Select an offer to preview</Text>;
  }

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontWeight="bold">Offer Details</Text>
      <VStack align="start" spacing={1}>
        <Text><strong>ID:</strong> {selectedOffer.id}</Text>
        <Text><strong>Title:</strong> {selectedOffer.title}</Text>
        <Text><strong>Status:</strong> {selectedOffer.status}</Text>
        <Text><strong>Supplier:</strong> {selectedOffer.supplier}</Text>
        <Text><strong>Price:</strong> ${selectedOffer.price.toFixed(2)}</Text>
        <Text><strong>Quantity:</strong> {selectedOffer.quantity}</Text>
      </VStack>
      {previewContent && (
        <>
          <Text fontWeight="bold" mt={4}>Description Preview</Text>
          <Textarea
            value={previewContent}
            isReadOnly
            resize="none"
            h="40vh"
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
        </>
      )}
    </VStack>
  );
};

function SupplierOffers() {
  const navigate = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "pending">("all");
  const [selectedOffer, setSelectedOffer] = useState<SupplierOffer | null>(null);
  const [previewContent, setPreviewContent] = useState("");
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
      setOffers((prev) => (page === 1 ? freshOffers : [...prev, ...freshOffers]));
    }
  }, [freshOffers, page]);

  const handleOfferClick = async (offer: SupplierOffer) => {
    setSelectedOffer(offer);
    try {
      if (offer.status === "active") {
        const content = await fetchOfferContent(offer.id);
        setPreviewContent(content);
      } else {
        setPreviewContent("");
      }
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message || "Unable to load offer details",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setPreviewContent("");
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

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === offer.status);
    return matchesSearch && matchesStatus;
  });

  const handleLoadMore = () => setPage((prev) => prev + 1);

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
    <Container maxW="full" bg="white" color="gray.800">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">Supplier Offers</Text>
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
                placeholder="Search Offers by Title..."
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
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive" | "pending")}
                w={{ base: "100%", md: "200px" }}
                borderColor="green.300"
                _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
                _hover={{ borderColor: "green.400" }}
                bg="white"
                color="gray.700"
                borderRadius="md"
                sx={{
                  "& option": {
                    color: "gray.700",
                    backgroundColor: "white",
                    _hover: { backgroundColor: "green.50" },
                  },
                }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </Select>
            </Flex>
            <VStack spacing={4} align="stretch">
              {filteredOffers.map((offer) => (
                <Box
                  key={offer.id}
                  p="4"
                  borderWidth="1px"
                  borderRadius="lg"
                  borderColor={selectedOffer?.id === offer.id ? "green.500" : "gray.200"}
                  bg={selectedOffer?.id === offer.id ? "green.50" : "white"}
                  cursor="pointer"
                  _hover={{
                    bg: selectedOffer?.id === offer.id ? "green.50" : "gray.50",
                  }}
                  onClick={() => handleOfferClick(offer)}
                >
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" color="gray.600">
                        Offer ID: {offer.id}
                      </Text>
                      <Text fontWeight="medium" color="gray.800">{offer.title}</Text>
                      <Text fontSize="sm" color="gray.500">
                        Supplier: {offer.supplier}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Price: ${offer.price.toFixed(2)}, Quantity: {offer.quantity}
                      </Text>
                      <Text fontSize="sm" color={offer.status === "active" ? "green.500" : offer.status === "pending" ? "yellow.500" : "red.500"}>
                        Status: {offer.status}
                      </Text>
                    </Box>
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
                  </Flex>
                </Box>
              ))}
              {filteredOffers.length === 0 && !isFetching && (
                <Text fontSize="sm" color="gray.500">No offers match your criteria</Text>
              )}
              {isFetching ? (
                <Text fontSize="sm" color="gray.500">Loading more...</Text>
              ) : (
                filteredOffers.length > 0 && (
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
                previewContent={previewContent}
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