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
  StatHelpText,
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

// Register all necessary Chart.js components
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
    { id: "1", name: "Spring Sale", validUntil: "2025-06-01" },
    { id: "2", name: "Summer Discount", validUntil: "2025-08-01" },
    { id: "3", name: "Winter Promo", validUntil: "2025-12-01" },
    { id: "4", name: "Expired Offer", validUntil: "2025-04-01" },
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

  const recentOrders = orders.filter((order) => {
    const orderDate = new Date(order.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return orderDate >= thirtyDaysAgo;
  }).length;

  const activeOffers = offers.filter((offer) => {
    const validUntil = new Date(offer.validUntil);
    return validUntil >= new Date();
  }).length;

  const newCustomers = customers.filter((customer) => {
    const joinDate = new Date(customer.joined);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return joinDate >= thirtyDaysAgo;
  }).length;

  // Sales growth (recent sales as % of total)
  const recentSales = orders
    .filter((order) => {
      const orderDate = new Date(order.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return orderDate >= thirtyDaysAgo;
    })
    .reduce((sum, order) => sum + order.amount, 0);

  const salesGrowth = totalSales
    ? ((recentSales / totalSales) * 100).toFixed(1)
    : "0.0";

  // Data for charts
  // Customers over time (new customers per month)
  const customersByMonth = customers.reduce((acc, customer) => {
    const date = new Date(customer.joined);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    acc[monthYear] = (acc[monthYear] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sales over time (total sales per month)
  const salesByMonth = orders.reduce((acc, order) => {
    const date = new Date(order.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    acc[monthYear] = (acc[monthYear] || 0) + order.amount;
    return acc;
  }, {} as Record<string, number>);

  // Common months (sorted)
  const months = Array.from(
    new Set([
      ...Object.keys(customersByMonth),
      ...Object.keys(salesByMonth),
    ])
  ).sort();

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={6}>
      {/* Summary Metrics with User's Name */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            Sales Dashboard
          </Text>
          <Text fontSize="lg" fontWeight="medium" color="gray.600">
            Welcome, {userName}
          </Text>
        </Flex>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={6}>
          <Stat
            p={5}
            shadow="md"
            borderWidth="1px"
            borderRadius="lg"
            bg="white"
            borderColor="gray.200"
          >
            <StatLabel color="gray.600">Total Customers</StatLabel>
            <StatNumber color="gray.800">
              {customersLoading ? "Loading..." : totalCustomers}
            </StatNumber>
            <StatHelpText color="gray.500">
              {newCustomers} new this month
            </StatHelpText>
          </Stat>
          <Stat
            p={5}
            shadow="md"
            borderWidth="1px"
            borderRadius="lg"
            bg="white"
            borderColor="gray.200"
          >
            <StatLabel color="gray.600">Total Orders</StatLabel>
            <StatNumber color="gray.800">
              {ordersLoading ? "Loading..." : totalOrders}
            </StatNumber>
            <StatHelpText color="gray.500">
              {recentOrders} in last 30 days
            </StatHelpText>
          </Stat>
          <Stat
            p={5}
            shadow="md"
            borderWidth="1px"
            borderRadius="lg"
            bg="white"
            borderColor="gray.200"
          >
            <StatLabel color="gray.600">Total Sales</StatLabel>
            <StatNumber color="gray.800">
              {ordersLoading ? "Loading..." : `$${totalSales}`}
            </StatNumber>
            <StatHelpText color="gray.500">
              {salesGrowth}% from recent
            </StatHelpText>
          </Stat>
          <Stat
            p={5}
            shadow="md"
            borderWidth="1px"
            borderRadius="lg"
            bg="white"
            borderColor="gray.200"
          >
            <StatLabel color="gray.600">Total Offers</StatLabel>
            <StatNumber color="gray.800">
              {offersLoading ? "Loading..." : totalOffers}
            </StatNumber>
            <StatHelpText color="gray.500">
              {activeOffers} active
            </StatHelpText>
          </Stat>
        </SimpleGrid>
      </Box>

      <Divider my={4} borderColor="gray.200" />

      {/* Charts Section */}
      <Box mb={8}>
        <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={4}>
          Trends
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {/* Customers Over Time Chart */}
          <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
            <Text fontSize="md" fontWeight="medium" color="gray.800" mb={2}>
              Customers Over Time
            </Text>
            <Line
              data={{
                labels: months,
                datasets: [{
                  label: "New Customers",
                  data: months.map((month) => customersByMonth[month] || 0),
                  borderColor: "#4A5568",
                  backgroundColor: "rgba(74, 85, 104, 0.2)",
                  fill: true,
                  tension: 0.3,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: "top" },
                  title: { display: false },
                },
                scales: {
                  y: { beginAtZero: true, title: { display: true, text: "Customers" } },
                  x: { title: { display: true, text: "Month" } }
                }
              }}
              height={200}
            />
          </Box>

          {/* Sales Over Time Chart */}
          <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
            <Text fontSize="md" fontWeight="medium" color="gray.800" mb={2}>
              Sales Over Time
            </Text>
            <Line
              data={{
                labels: months,
                datasets: [{
                  label: "Sales ($)",
                  data: months.map((month) => salesByMonth[month] || 0),
                  borderColor: "#FFD700",
                  backgroundColor: "rgba(255, 215, 0, 0.2)",
                  fill: true,
                  tension: 0.3,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: "top" },
                  title: { display: false },
                },
                scales: {
                  y: { beginAtZero: true, title: { display: true, text: "Sales ($)" } },
                  x: { title: { display: true, text: "Month" } }
                }
              }}
              height={200}
            />
          </Box>
        </SimpleGrid>
      </Box>

      <Divider my={4} borderColor="gray.200" />

      {/* Recent Orders */}
      <Box>
        <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={4}>
          Recent Orders
        </Text>
        <VStack spacing={4} align="stretch">
          {orders.length === 0 ? (
            <Text textAlign="center" fontSize="lg" color="gray.600">
              No recent orders.
            </Text>
          ) : (
            orders
              .slice(0, 5)
              .map((order) => (
                <Box
                  key={order.id}
                  p={5}
                  shadow="md"
                  borderWidth="1px"
                  borderRadius="lg"
                  bg="white"
                  borderColor="gray.200"
                >
                  <Text fontWeight="bold" color="gray.800">
                    Order #{order.id}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Customer ID: {order.customerId} | Date: {order.date} | Amount: ${order.amount}
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