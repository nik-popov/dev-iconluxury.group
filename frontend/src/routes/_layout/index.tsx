import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Container,
  Text,
  VStack,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Flex,
} from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { UserPublic } from "../../client";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
});

// Mock data fetching functions (replace with actual API calls)
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
    { id: "1", customerId: "1", date: "2025-05-10", amount: 100, source: "standard" },
    { id: "2", customerId: "2", date: "2025-05-05", amount: 200, source: "standard" },
    { id: "3", customerId: "1", date: "2025-04-25", amount: 150, source: "standard" },
    { id: "4", customerId: "3", date: "2025-03-15", amount: 300, source: "standard" },
    { id: "5", customerId: "4", date: "2025-05-15", amount: 250, source: "standard" },
  ];
};

const fetchOffers = async () => {
  return [
    { id: "1", name: "Spring Sale", validUntil: "2025-06-01", views: [
      { month: "2025-03", count: 50 },
      { month: "2025-04", count: 80 },
      { month: "2025-05", count: 120 },
    ]},
    { id: "2", name: "Summer Discount", validUntil: "2025-08-01", views: [
      { month: "2025-03", count: 30 },
      { month: "2025-04", count: 60 },
      { month: "2025-05", count: 100 },
    ]},
    { id: "3", name: "Winter Promo", validUntil: "2025-12-01", views: [
      { month: "2025-03", count: 20 },
      { month: "2025-04", count: 40 },
      { month: "2025-05", count: 70 },
    ]},
    { id: "4", name: "Expired Offer", validUntil: "2025-04-01", views: [
      { month: "2025-03", count: 40 },
      { month: "2025-04", count: 50 },
    ]},
  ];
};

function Dashboard() {
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);
  const userName = currentUser?.full_name || currentUser?.email || "Guest";

  // Fetch summary data
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["offers"],
    queryFn: fetchOffers,
  });

  // Calculate summary metrics
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, order) => sum + order.amount, 0);
  const totalOffers = offers.length;

  // Offer views over time
  const viewsByMonth = offers.reduce((acc, offer) => {
    offer.views.forEach(({ month, count }) => {
      acc[month] = (acc[month] || 0) + count;
    });
    return acc;
  }, {} as Record<string, number>);

  const months = Object.keys(viewsByMonth).sort();

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      {/* Header with User's Name */}
      <Box mb={4}>
        <Flex justify="space-between" align="center">
          <Text fontSize="xl" fontWeight="bold" color="gray.800">
            Sales Dashboard
          </Text>
          <Text fontSize="md" fontWeight="medium" color="gray.600">
            Welcome, {userName}
          </Text>
        </Flex>
      </Box>

      {/* Summary Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4} mb={4}>
        <Stat
          p={3}
          shadow="sm"
          borderWidth="1px"
          borderRadius="md"
          bg="white"
          borderColor="gray.200"
        >
          <StatLabel fontSize="sm" color="gray.600">Customers</StatLabel>
          <StatNumber fontSize="lg" color="gray.800">
            {customersLoading ? "Loading..." : totalCustomers}
          </StatNumber>
        </Stat>
        <Stat
          p={3}
          shadow="sm"
          borderWidth="1px"
          borderRadius="md"
          bg="white"
          borderColor="gray.200"
        >
          <StatLabel fontSize="sm" color="gray.600">Orders</StatLabel>
          <StatNumber fontSize="lg" color="gray.800">
            {ordersLoading ? "Loading..." : totalOrders}
          </StatNumber>
        </Stat>
        <Stat
          p={3}
          shadow="sm"
          borderWidth="1px"
          borderRadius="md"
          bg="white"
          borderColor="gray.200"
        >
          <StatLabel fontSize="sm" color="gray.600">Sales</StatLabel>
          <StatNumber fontSize="lg" color="gray.800">
            {ordersLoading ? "Loading..." : `$${totalSales}`}
          </StatNumber>
        </Stat>
        <Stat
          p={3}
          shadow="sm"
          borderWidth="1px"
          borderRadius="md"
          bg="white"
          borderColor="gray.200"
        >
          <StatLabel fontSize="sm" color="gray.600">Offers</StatLabel>
          <StatNumber fontSize="lg" color="gray.800">
            {offersLoading ? "Loading..." : totalOffers}
          </StatNumber>
        </Stat>
      </SimpleGrid>

      <Divider my={3} borderColor="gray.200" />

      {/* Offer Views Over Time Chart */}
      <Box mb={4}>
        <Text fontSize="md" fontWeight="bold" color="gray.800" mb={2}>
          Offer Views Over Time
        </Text>
        <Box p={3} shadow="sm" borderWidth="1px" borderRadius="md" bg="white">
          <Line
            data={{
              labels: months,
              datasets: [{
                label: "Offer Views",
                data: months.map((month) => viewsByMonth[month] || 0),
                borderColor: "#2D3748",
                backgroundColor: "rgba(45, 55, 72, 0.1)",
                fill: true,
                tension: 0.3,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: { display: false },
              },
              scales: {
                y: { beginAtZero: true, title: { display: false }, grid: { display: false } },
                x: { title: { display: false }, grid: { display: false } }
              }
            }}
            height={150}
          />
        </Box>
      </Box>

      <Divider my={3} borderColor="gray.200" />

      {/* Recent Orders */}
      <Box>
        <Text fontSize="md" fontWeight="bold" color="gray.800" mb={2}>
          Recent Orders
        </Text>
        <VStack spacing={3} align="stretch">
          {orders.length === 0 ? (
            <Text fontSize="sm" color="gray.600">No recent orders.</Text>
          ) : (
            orders
              .slice(0, 3)
              .map((order) => (
                <Box
                  key={order.id}
                  p={3}
                  shadow="sm"
                  borderWidth="1px"
                  borderRadius="md"
                  bg="white"
                  borderColor="gray.200"
                >
                  <Text fontSize="sm" fontWeight="medium" color="gray.800">
                    Order #{order.id}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    Customer ID: {order.customerId} | Date: {order.date} | ${order.amount}
                  </Text>
                </Box>
              ))
          )}
        </VStack>
      </Box>
    </Container>
  );
}

export default Dashboard;