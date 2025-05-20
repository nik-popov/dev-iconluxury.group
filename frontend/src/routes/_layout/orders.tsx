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
} from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";

// Reuse the mock data fetching functions from the dashboard
const fetchCustomers = async () => {
  return [
    { id: "1", name: "John Doe", joined: "2025-05-01" },
    { id: "2", name: "Jane Smith", joined: "2025-04-15" },
    { id: "3", name: "Bob Johnson", joined: "2025-03-20" },
    { id: "4", name: "Alice Brown", joined: "2025-05-10" },
    { id: "5", name: "Charlie Davis", joined: "2025-04-01" },
  ];
};

const fetchOrders = async () => {
  return [
    { id: "1", customerId: "1", date: "2025-05-10", amount: 100, quantity: 5, units: "items", source: "standard" },
    { id: "2", customerId: "2", date: "2025-05-05", amount: 200, quantity: 10, units: "boxes", source: "standard" },
    { id: "3", customerId: "1", date: "2025-04-25", amount: 150, quantity: 8, units: "items", source: "standard" },
    { id: "4", customerId: "3", date: "2025-03-15", amount: 300, quantity: 15, units: "units", source: "standard" },
    { id: "5", customerId: "4", date: "2025-05-15", amount: 250, quantity: 12, units: "boxes", source: "standard" },
  ];
};

export const Route = createFileRoute("/_layout/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  // Fetch orders and customers
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  // Create a customer ID to name map
  const customerMap = customers.reduce((acc, customer) => {
    acc[customer.id] = customer.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      {/* Header */}
      <Box mb={4}>
        <Text fontSize="xl" fontWeight="bold" color="gray.800">
          Orders
        </Text>
      </Box>

      <Divider my={3} borderColor="gray.200" />

      {/* Orders Table */}
      <Box>
        <Text fontSize="md" fontWeight="bold" color="gray.800" mb={2}>
          All Orders
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
                <Th>Order #</Th>
                <Th>Customer Name</Th>
                <Th>Total Value</Th>
                <Th>Total Quantity</Th>
                <Th>Units</Th>
                <Th>Date</Th>
                <Th>Source</Th>
              </Tr>
            </Thead>
            <Tbody>
              {ordersLoading || customersLoading ? (
                <Tr>
                  <Td colSpan={7} textAlign="center">
                    <Text fontSize="sm" color="gray.600">Loading...</Text>
                  </Td>
                </Tr>
              ) : orders.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center">
                    <Text fontSize="sm" color="gray.600">No orders found.</Text>
                  </Td>
                </Tr>
              ) : (
                orders.map((order) => (
                  <Tr key={order.id}>
                    <Td>{order.id}</Td>
                    <Td>{customerMap[order.customerId] || "Unknown"}</Td>
                    <Td>${order.amount}</Td>
                    <Td>{order.quantity}</Td>
                    <Td>{order.units}</Td>
                    <Td>{order.date}</Td>
                    <Td>{order.source}</Td>
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

export default OrdersPage;