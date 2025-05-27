import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Container,
  Text,
  VStack,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Flex,
  Input,
  Select,
  Button,
  Tabs,
  TabList,
  Tab,
  IconButton,
} from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { FiFilter, FiMoreVertical } from "react-icons/fi";
import type { UserPublic } from "../../client";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
});

// Mock data fetching functions
const fetchCustomers = async () => {
  return [
    { id: "1", name: "Theo Lawrence", joined: "2024-10-18" },
    { id: "2", name: "Amy March", joined: "2024-05-24" },
  ];
};

const fetchOrders = async () => {
  return [
    { id: "1", customerId: "1", date: "2024-10-18", amount: 50000, source: "Credit Card" },
    { id: "2", customerId: "2", date: "2024-05-24", amount: 50000, source: "Bank Transfer" },
  ];
};

const fetchCashFlow = async () => {
  return [
    { date: "2024-10-18", amount: 5000 },
    { date: "2024-10-25", amount: -3000 },
    { date: "2024-11-02", amount: 4000 },
    { date: "2024-11-09", amount: -2000 },
    { date: "2024-11-18", amount: 3000 },
  ];
};

const fetchActivity = async () => {
  return [
    { type: "Page View", name: "Theo Lawrence", date: "2024-10-18", amount: 120, currency: "USD" },
    { type: "Order", name: "Amy March", date: "2024-05-24", amount: 150, currency: "USD" },
  ];
};

const fetchMessages = async () => {
  return [
    { customer: "Theo Lawrence", message: "Can you update my order status?", date: "2024-10-18" },
    { customer: "Amy March", message: "I need assistance with payment.", date: "2024-05-24" },
  ];
};

function Dashboard() {
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);
  const userName = currentUser?.full_name || currentUser?.email || "Young Alaska";

  // Fetch data
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const { data: cashFlow = [], isLoading: cashFlowLoading } = useQuery({
    queryKey: ["cashFlow"],
    queryFn: fetchCashFlow,
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: fetchActivity,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: fetchMessages,
  });

  // Calculate summary metrics
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  const totalMerchandiseValue = 320845.20; // As per screenshot
  const totalBusinessAccount = 8672.20;
  const totalSaving = 3765.35;
  const totalReserve = 14376.16; // Completed from screenshot

  // Sales data
  const dates = cashFlow.map(item => item.date);
  const amounts = cashFlow.map(item => item.amount);
  const highestPoint = Math.max(...amounts);
  const lowestPoint = Math.min(...amounts);
  const increaseValue = highestPoint > 0 ? `${highestPoint} on ${dates[amounts.indexOf(highestPoint)]}` : "N/A";
  const dropValue = lowestPoint < 0 ? `${lowestPoint} on ${dates[amounts.indexOf(lowestPoint)]}` : "N/A";

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      {/* Top Bar with Search, Date Filter, and Export */}
      <Flex justify="space-between" align="center" mb={4}>
        <Flex align="center">
          <Input placeholder="Search" size="sm" mr={2} borderRadius="md" />
          <Select size="sm" defaultValue="Last 30 days" w="150px" borderRadius="md">
            <option value="Last 30 days">Last 30 days</option>
            <option value="Last 7 days">Last 7 days</option>
            <option value="Last 90 days">Last 90 days</option>
          </Select>
        </Flex>
        <Button size="sm" variant="outline" borderRadius="md">Export</Button>
      </Flex>

      {/* Total Merchandise Value */}
      <Box p={4} bg="gray.700" color="white" borderRadius="md" mb={4}>
        <Flex justify="space-between" align="center">
          <Box>
            <Text fontSize="sm">TOTAL BALANCE</Text>
            <Text fontSize="2xl" fontWeight="bold">€ {totalMerchandiseValue.toLocaleString()}</Text>
            <Text fontSize="sm" color="green.300">16.50% ↑</Text>
          </Box>
          <Flex>
            <IconButton aria-label="Add" icon={<Text fontSize="lg">+</Text>} size="sm" mr={2} bg="green.500" color="white" borderRadius="full" />
            <IconButton aria-label="More" icon={<FiMoreVertical />} size="sm" bg="gray.600" color="white" borderRadius="full" />
          </Flex>
        </Flex>
      </Box>

      {/* Sales Chart with High/Low Points */}
      <Box mb={4}>
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="md" fontWeight="bold" color="gray.800">SALES</Text>
          <Flex>
            <Tabs variant="soft-rounded" size="sm">
              <TabList>
                <Tab>Weekly</Tab>
                <Tab>Daily</Tab>
                <Tab>Monthly</Tab>
                <Tab>Yearly</Tab>
              </TabList>
            </Tabs>
            <Button size="sm" ml={2} variant="outline" borderRadius="md">Manage</Button>
          </Flex>
        </Flex>
        <Flex>
          <Box flex="3" p={3} shadow="sm" borderWidth="1px" borderRadius="md" bg="white">
            <Bar
              data={{
                labels: dates,
                datasets: [
                  {
                    label: "Sales",
                    data: amounts,
                    backgroundColor: amounts.map(amount => amount >= 0 ? "rgba(75, 192, 192, 0.6)" : "rgba(255, 99, 132, 0.6)"),
                    borderColor: amounts.map(amount => amount >= 0 ? "rgba(75, 192, 192, 1)" : "rgba(255, 99, 132, 1)"),
                    borderWidth: 1,
                  },
                ],
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
                  x: { title: { display: false }, grid: { display: false } },
                },
              }}
              height={150}
            />
          </Box>
          <Box flex="1" ml={4}>
            <Box mb={4}>
              <Text fontSize="sm" color="gray.600">Highest Point</Text>
              <Text fontSize="md" fontWeight="bold">€ {increaseValue}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Lowest Point</Text>
              <Text fontSize="md" fontWeight="bold">€ {dropValue}</Text>
            </Box>
          </Box>
        </Flex>
      </Box>

      {/* Summary Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4} mb={4}>
        <Stat p={3} shadow="sm" borderWidth="1px" borderRadius="md" bg="white" borderColor="gray.200">
          <StatLabel fontSize="sm" color="gray.600">Business Account</StatLabel>
          <StatNumber fontSize="lg" color="gray.800">
            {customersLoading ? "Loading..." : `€ ${totalBusinessAccount.toLocaleString()}`}
          </StatNumber>
          <Text fontSize="xs" color="green.500">16.50% ↑ vs. 7,120.14 Last Period</Text>
        </Stat>
        <Stat p={3} shadow="sm" borderWidth="1px" borderRadius="md" bg="white" borderColor="gray.200">
          <StatLabel fontSize="sm" color="gray.600">Total Saving</StatLabel>
          <StatNumber fontSize="lg" color="gray.800">
            {ordersLoading ? "Loading..." : `€ ${totalSaving.toLocaleString()}`}
          </StatNumber>
          <Text fontSize="xs" color="red.500">8.21% ↓ vs. 4,116.50 Last Period</Text>
        </Stat>
        <Stat p={3} shadow="sm" borderWidth="1px" borderRadius="md" bg="white" borderColor="gray.200">
          <StatLabel fontSize="sm" color="gray.600">Reserve</StatLabel>
          <StatNumber fontSize="lg" color="gray.800">
            {ordersLoading ? "Loading..." : `€ ${totalReserve.toLocaleString()}`}
          </StatNumber>
          <Text fontSize="xs" color="green.500">35.16% ↑ vs. 10,236.46 Last Period</Text>
        </Stat>
      </SimpleGrid>

      {/* Recent Activity and Communication in Two Columns */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Recent Activity */}
        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">Recent Activity</Text>
            <Flex>
              <IconButton aria-label="Filter" icon={<FiFilter />} size="sm" variant="outline" mr={2} />
              <Button size="sm" variant="outline">Sort</Button>
            </Flex>
          </Flex>
          <VStack spacing={3} align="stretch">
            {activity.length === 0 ? (
              <Text fontSize="sm" color="gray.600">No recent activity.</Text>
            ) : (
              activity.map((item, index) => (
                <Box key={index} p={3} shadow="sm" borderWidth="1px" borderRadius="md" bg="white" borderColor="gray.200">
                  <Flex justify="space-between">
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="gray.800">{item.type}</Text>
                      <Text fontSize="xs" color="gray.600">{item.name} • {item.date}</Text>
                    </Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.800">{item.amount} {item.currency}</Text>
                  </Flex>
                </Box>
              ))
            )}
          </VStack>
        </Box>

        {/* Communication Card */}
        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">Communication</Text>
            <Button size="sm" variant="outline">See All</Button>
          </Flex>
          <VStack spacing={3} align="stretch">
            {messages.length === 0 ? (
              <Text fontSize="sm" color="gray.600">No recent messages.</Text>
            ) : (
              messages.map((msg, index) => (
                <Box key={index} p={3} shadow="sm" borderWidth="1px" borderRadius="md" bg="white" borderColor="gray.200">
                  <Flex justify="space-between">
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="gray.800">{msg.customer}</Text>
                      <Text fontSize="xs" color="gray.600">{msg.message}</Text>
                    </Box>
                    <Text fontSize="xs" color="gray.600">{msg.date}</Text>
                  </Flex>
                </Box>
              ))
            )}
          </VStack>
        </Box>
      </SimpleGrid>
    </Container>
  );
}

export default Dashboard;