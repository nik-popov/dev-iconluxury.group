import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
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
  ];
};

const fetchOrders = async () => {
  return [
    { id: "1", customerId: "1", date: "2025-05-10", amount: 100, source: "google-serp" },
    { id: "2", customerId: "2", date: "2025-05-05", amount: 200, source: "standard" },
    { id: "3", customerId: "1", date: "2025-04-25", amount: 150, source: "google-serp" },
    { id: "4", customerId: "3", date: "2025-03-15", amount: 300, source: "standard" },
    { id: "5", customerId: "4", date: "2025-02-20", amount: 250, source: "google-serp" },
  ];
};

const fetchOffers = async () => {
  return [
    { id: "1", name: "Spring Sale", validUntil: "2025-06-01" },
    { id: "2", name: "Summer Discount", validUntil: "2025-08-01" },
    { id: "3", name: "Expired Offer", validUntil: "2025-04-01" },
  ];
};

function Dashboard() {
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);
  const isSuperuser = currentUser?.is_superuser || false;

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

  // Filter orders for superusers (restrict google-serp orders)
  const accessibleOrders = isSuperuser
    ? orders
    : orders.filter((order) => order.source !== "google-serp");

  // Prepare chart data (orders per month)
  const orderTrends = accessibleOrders.reduce((acc, order) => {
    const date = new Date(order.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    acc[monthYear] = (acc[monthYear] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = {
    labels: Object.keys(orderTrends).sort(),
    datasets: [
      {
        label: "Orders per Month",
        data: Object.values(orderTrends),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Order Trends" },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Number of Orders" } },
      x: { title: { display: true, text: "Month" } },
    },
  };

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={6}>
      {/* Summary Metrics */}
      <Box mb={8}>
        <Text fontSize="2xl" fontWeight="bold" color="gray.800" mb={4}>
          Sales Dashboard
        </Text>
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
              {ordersLoading ? "Loading..." : accessibleOrders.length}
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
              {ordersLoading ? "Loading..." : `$${accessibleOrders.reduce((sum, order) => sum + order.amount, 0)}`}
            </StatNumber>
            <StatHelpText color="gray.500">All time</StatHelpText>
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

      {/* Order Trends Chart */}
      <Box mb={8}>
        <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={4}>
          Order Trends
        </Text>
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
          <Line data={chartData} options={chartOptions} />
        </Box>
      </Box>

      {/* Recent Activity */}
      <Box>
        <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={4}>
          Recent Orders
        </Text>
        <VStack spacing={4} align="stretch">
          {accessibleOrders.length === 0 ? (
            <Text textAlign="center" fontSize="lg" color="gray.600">
              No recent orders.
            </Text>
          ) : (
            accessibleOrders
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
                  {order.source === "google-serp" && (
                    <Text fontSize="sm" color="gray.500">
                      Source: Google SERP (Superuser)
                    </Text>
                  )}
                </Box>
              ))
          )}
        </VStack>
      </Box>
    </Container>
  );
}

export default Dashboard;