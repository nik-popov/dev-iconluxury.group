import { useQuery } from "@tanstack/react-query";
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
} from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";

// Mock data fetching function for offers
const fetchOffers = async () => {
  return [
    {
      id: "1",
      name: "Spring Sale",
      dateMade: "2025-03-01",
      validUntil: "2025-06-01",
      units: "items",
      totalQty: 100,
      totalValue: 5000,
      views: [
        { month: "2025-03", count: 50 },
        { month: "2025-04", count: 80 },
        { month: "2025-05", count: 120 },
      ],
      bids: 10,
      status: "live",
    },
    {
      id: "2",
      name: "Summer Discount",
      dateMade: "2025-04-01",
      validUntil: "2025-08-01",
      units: "packages",
      totalQty: 50,
      totalValue: 3000,
      views: [
        { month: "2025-03", count: 30 },
        { month: "2025-04", count: 60 },
        { month: "2025-05", count: 100 },
      ],
      bids: 8,
      status: "live",
    },
    {
      id: "3",
      name: "Winter Promo",
      dateMade: "2025-02-01",
      validUntil: "2025-12-01",
      units: "items",
      totalQty: 80,
      totalValue: 4000,
      views: [
        { month: "2025-03", count: 20 },
        { month: "2025-04", count: 40 },
        { month: "2025-05", count: 70 },
      ],
      bids: 5,
      status: "pending",
    },
    {
      id: "4",
      name: "Expired Offer",
      dateMade: "2025-01-01",
      validUntil: "2025-04-01",
      units: "units",
      totalQty: 60,
      totalValue: 2000,
      views: [
        { month: "2025-03", count: 40 },
        { month: "2025-04", count: 50 },
      ],
      bids: 3,
      status: "closed",
    },
    {
      id: "5",
      name: "Special Deal",
      dateMade: "2025-03-15",
      validUntil: "2025-04-15",
      units: "items",
      totalQty: 40,
      totalValue: 1500,
      views: [
        { month: "2025-03", count: 25 },
        { month: "2025-04", count: 45 },
      ],
      bids: 12,
      status: "sold",
    },
  ];
};

export const Route = createFileRoute("/_layout/offers")({
  component: OffersPage,
});

function OffersPage() {
  // Fetch offers
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["offers"],
    queryFn: fetchOffers,
  });

  // Calculate total views for each offer
  const getTotalViews = (views: { month: string; count: number }[]) =>
    views.reduce((sum, view) => sum + view.count, 0);

  // Map status to badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "green";
      case "pending":
        return "yellow";
      case "closed":
        return "red";
      case "sold":
        return "blue";
      default:
        return "gray";
    }
  };

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      {/* Header */}
      <Box mb={4}>
        <Text fontSize="xl" fontWeight="bold" color="gray.800">
          Offers
        </Text>
      </Box>

      <Divider my={3} borderColor="gray.200" />

      {/* Offers Table */}
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
                <Th>Offer Name</Th>
                <Th>Date Made</Th>
                <Th>Units</Th>
                <Th>Total Qty</Th>
                <Th>Total Value</Th>
                <Th>Views</Th>
                <Th>Bids</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {offersLoading ? (
                <Tr>
                  <Td colSpan={9} textAlign="center">
                    <Text fontSize="sm" color="gray.600">Loading...</Text>
                  </Td>
                </Tr>
              ) : offers.length === 0 ? (
                <Tr>
                  <Td colSpan={9} textAlign="center">
                    <Text fontSize="sm" color="gray.600">No offers found.</Text>
                  </Td>
                </Tr>
              ) : (
                offers.map((offer) => (
                  <Tr key={offer.id}>
                    <Td>{offer.id}</Td>
                    <Td>{offer.name}</Td>
                    <Td>{offer.dateMade}</Td>
                    <Td>{offer.units}</Td>
                    <Td>{offer.totalQty}</Td>
                    <Td>${offer.totalValue}</Td>
                    <Td>{getTotalViews(offer.views)}</Td>
                    <Td>{offer.bids}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(offer.status || "unknown")}>
                        {(offer.status || "unknown").toUpperCase()}
                      </Badge>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
}

export default OffersPage;