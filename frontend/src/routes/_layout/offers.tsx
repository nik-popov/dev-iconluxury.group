import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  SimpleGrid,
  Stat,
  StatLabel,
  Icon,
  StatNumber,
  Flex,
  Input,
  Tabs,
  TabList,
  Tab,
  IconButton,
  Avatar,
} from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { FiFilter, FiMoreVertical, FiArrowUp, FiArrowDown, FiShoppingCart, FiMessageSquare, FiUpload, FiTag } from "react-icons/fi";
import type { UserPublic } from "./../../client";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Interfaces for mock data
interface Customer {
  id: string;
  name: string;
  joined: string;
}

interface Order {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  source: string;
}

interface CashFlow {
  date: string;
  amount: number;
}

interface Activity {
  type: "Order" | "Message" | "Upload" | "Offer";
  name: string;
  date: string;
  amount: number;
  currency: string;
}

interface Message {
  customer: string;
  message: string;
  date: string;
}

// Mock data fetching functions
const fetchCustomers = async (): Promise<Customer[]> => {
  return [
    { id: "1", name: "Theo Lawrence", joined: "2024-10-18" },
    { id: "2", name: "Amy March", joined: "2024-05-24" },
    { id: "3", name: "John Doe", joined: "2024-03-15" },
    { id: "4", name: "Jane Smith", joined: "2024-11-01" },
    { id: "5", name: "Alice Johnson", joined: "2024-09-10" },
    { id: "6", name: "Bob Brown", joined: "2024-07-20" },
    { id: "7", name: "Charlie Davis", joined: "2024-06-05" },
    { id: "8", name: "Eve White", joined: "2024-08-30" },
    { id: "9", name: "Frank Black", joined: "2024-04-22" },
    { id: "10", name: "Grace Green", joined: "2024-02-14" },
    { id: "11", name: "Hannah Blue", joined: "2024-01-01" },
    { id: "12", name: "Ian Gray", joined: "2024-12-25" },
    { id: "13", name: "Jack Red", joined: "2024-11-30" },
    { id: "14", name: "Kathy Yellow", joined: "2024-10-05" },
    { id: "15", name: "Leo Purple", joined: "2024-09-15" },
    { id: "16", name: "Mia Orange", joined: "2024-08-01" },
    { id: "17", name: "Nina Pink", joined: "2024-07-10" },
    { id: "18", name: "Oscar Cyan", joined: "2024-06-20" },
    { id: "19", name: "Paul Magenta", joined: "2024-05-30" },
    { id: "20", name: "Quinn Teal", joined: "2024-04-10" },
  ];
};

const fetchOrders = async (): Promise<Order[]> => {
  return [
    { id: "1", customerId: "1", date: "2024-10-18", amount: 50000, source: "Credit Card" },
    { id: "2", customerId: "2", date: "2024-05-24", amount: 50000, source: "Bank Transfer" },
  ];
};

const fetchCashFlow = async (): Promise<CashFlow[]> => {
  return [
    { date: "2024-10-18", amount: 5000 },
    { date: "2024-10-25", amount: 3000 },
    { date: "2024-11-02", amount: 4000 },
    { date: "2024-11-09", amount: 2000 },
    { date: "2024-11-18", amount: 3000 },
  ];
};

const fetchActivity = async (): Promise<Activity[]> => {
  return [
    { type: "Order", name: "Theo Lawrence", date: "2024-10-18", amount: 120, currency: "USD" },
    { type: "Message", name: "Amy March", date: "2024-05-24", amount: 150, currency: "USD" },
    { type: "Upload", name: "Theo Lawrence", date: "2024-10-19", amount: 0, currency: "USD" },
    { type: "Offer", name: "Amy March", date: "2024-05-25", amount: 200, currency: "USD" },
  ];
};

const fetchMessages = async (): Promise<Message[]> => {
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
  const { data: customers = [], isPending: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const { data: orders = [], isPending: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const { data: cashFlow = [], isPending: cashFlowLoading } = useQuery({
    queryKey: ["cashFlow"],
    queryFn: fetchCashFlow,
  });

  const { data: activity = [], isPending: activityLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: fetchActivity,
  });

  const { data: messages = [], isPending: messagesLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: fetchMessages,
  });

  // Calculate summary metrics
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  const totalMerchandiseValue = 320845.2; // As per screenshot
  const totalOffers = 10;
  const totalCustomersCount = customers.length;
  const totalOpenOrders = 14376.16;

  // Use all cash flow data
  const dates = cashFlow.map((item) => item.date);
  const amounts = cashFlow.map((item) => item.amount);
  const highestPoint = amounts.length > 0 ? Math.max(...amounts) : 0;
  const lowestPoint = amounts.length > 0 ? Math.min(...amounts) : 0;

  // Map activity types to icons
  const activityIcons: Record<Activity["type"], React.ComponentType> = {
    Order: FiShoppingCart,
    Message: FiMessageSquare,
    Upload: FiUpload,
    Offer: FiTag,
  };

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      {/* Top Bar with Search and Filter */}
      <Flex justify="space-between" align="center" mb={4}>
        <Input placeholder="Search" size="sm" mr={4} borderRadius="md" />
        <Flex align="center">
          <Tabs variant="soft-rounded" size="sm">
            <TabList>
              <Tab>Daily</Tab>
              <Tab>Weekly</Tab>
              <Tab>Monthly</Tab>
              <Tab>Yearly</Tab>
            </TabList>
          </Tabs>
          <Button size="sm" variant="outline" borderRadius="md" ml={4}>
            Export
          </Button>
        </Flex>
      </Flex>

      {/* Total Merchandise Value */}
      <Box
        p={4}
        bg="white"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        mb={4}
      >
        <Flex justify="space-between" align="center">
          <Box>
            <Text fontSize="sm" color="gray.600">
              TOTAL MERCHANDISE VALUE
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              € {totalMerchandiseValue.toLocaleString()}
            </Text>
            <Text fontSize="sm" color="green.500">
              16.50% <Icon as={FiArrowUp} color="green.500" />
            </Text>
          </Box>
          <Flex>
            <IconButton
              aria-label="Add"
              icon={<Text fontSize="lg">+</Text>}
              size="sm"
              mr={2}
              bg="white"
              color="gray.800"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="full"
            />
            <IconButton
              aria-label="More"
              icon={<FiMoreVertical />}
              size="sm"
              bg="gray.600"
              color="white"
              borderRadius="full"
            />
          </Flex>
        </Flex>
      </Box>

      {/* Sales Chart with High/Low Points */}
      <Box mb={4}>
        <Box
          bg="white"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Flex justify="space-between" align="center" p={4} pb={0}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              Total Sales
            </Text>
          </Flex>
          <Flex p={4}>
            <Box flex="3">
              <Bar
                data={{
                  labels: dates,
                  datasets: [
                    {
                      label: "Sales",
                      data: amounts,
                      backgroundColor: amounts.map((amount) =>
                        amount >= 0
                          ? "rgba(75, 192, 192, 0.6)"
                          : "rgba(255, 99, 132, 0.6)"
                      ),
                      borderColor: amounts.map((amount) =>
                        amount >= 0
                          ? "rgba(75, 192, 192, 1)"
                          : "rgba(255, 99, 132, 1)"
                      ),
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
                    y: {
                      beginAtZero: true,
                      title: { display: false },
                      grid: { display: false },
                    },
                    x: { title: { display: false }, grid: { display: false } },
                  },
                }}
                height={150}
              />
            </Box>
            <Box
              flex="1"
              ml={4}
              bg="white"
              shadow="sm"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              p={3}
            >
              <Box mb={4}>
                <Text fontSize="sm" color="gray.600">
                  Peak Value
                </Text>
                <Text fontSize="xl" fontWeight="bold">
                  € {highestPoint}
                </Text>
                <Text fontSize="xs" color="green.500">
                  45.00% <Icon as={FiArrowUp} color="green.500" />
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">
                  Lowest Value
                </Text>
                <Text fontSize="xl" fontWeight="bold">
                  € {lowestPoint}
                </Text>
                <Text fontSize="xs" color="red.500">
                  12.50% <Icon as={FiArrowDown} color="red.500" />
                </Text>
              </Box>
            </Box>
          </Flex>
        </Box>
      </Box>

      {/* Summary Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4} mb={4}>
        <Box
          bg="white"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Stat p={3}>
            <StatLabel fontSize="sm" color="gray.600">
              Total Offers
            </StatLabel>
            <StatNumber fontSize="lg" color="gray.800">
              {customersLoading ? "Loading..." : `${totalOffers.toLocaleString()}`}
            </StatNumber>
            <Text fontSize="xs" color="green.500">
              16.50% <Icon as={FiArrowUp} color="green.500" /> vs. 7,120.14 Last
              Period
            </Text>
          </Stat>
        </Box>
        <Box
          bg="white"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Stat p={3}>
            <StatLabel fontSize="sm" color="gray.600">
              Total Customers
            </StatLabel>
            <StatNumber fontSize="lg" color="gray.800">
              {customersLoading ? "Loading..." : `${totalCustomersCount}`}
            </StatNumber>
            <Text fontSize="xs" color="red.500">
              8.21% <Icon as={FiArrowDown} color="red.500" /> vs. 4,116.50 Last
              Period
            </Text>
          </Stat>
        </Box>
        <Box
          bg="white"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Stat p={3}>
            <StatLabel fontSize="sm" color="gray.600">
              Open Orders
            </StatLabel>
            <StatNumber fontSize="lg" color="gray.800">
              {ordersLoading ? "Loading..." : `€ ${totalOpenOrders.toLocaleString()}`}
            </StatNumber>
            <Text fontSize="xs" color="green.500">
              35.16% <Icon as={FiArrowUp} color="green.500" /> vs. 10,236.46 Last
              Period
            </Text>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Recent Activity and Communication */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Recent Activity */}
        <Box
          bg="white"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Flex justify="space-between" align="center" p={4} pb={0}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              Recent Activity
            </Text>
            <Flex>
              <IconButton
                aria-label="Filter"
                icon={<FiFilter />}
                size="sm"
                variant="outline"
                mr={2}
              />
              <Button size="sm" variant="outline">
                Sort
              </Button>
            </Flex>
          </Flex>
          <Box p={4} pt={2}>
            <VStack spacing={3} align="stretch">
              {activity.length === 0 ? (
                <Text fontSize="sm" color="gray.600">
                  No recent activity.
                </Text>
              ) : (
                activity.map((item, index) => (
                  <Box
                    key={index}
                    p={3}
                    shadow="sm"
                    borderWidth="1px"
                    borderRadius="md"
                    bg="white"
                    borderColor="gray.200"
                  >
                    <Flex justify="space-between" align="center">
                      <Flex align="center">
                        <Icon as={activityIcons[item.type]} color="gray.600" mr={3} />
                        <Box>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color="gray.800"
                          >
                            {item.type}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {item.name} • {item.date}
                          </Text>
                        </Box>
                      </Flex>
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color="gray.800"
                      >
                        {item.amount} {item.currency}
                      </Text>
                    </Flex>
                  </Box>
                ))
              )}
            </VStack>
          </Box>
        </Box>

        {/* Communication Card */}
        <Box
          bg="white"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Flex justify="space-between" align="center" p={4} pb={0}>
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              Communication
            </Text>
            <Button size="sm" variant="outline">
              See All
            </Button>
          </Flex>
          <Box p={4} pt={2}>
            <VStack spacing={3} align="stretch">
              {messages.length === 0 ? (
                <Text fontSize="sm" color="gray.600">
                  No recent messages.
                </Text>
              ) : (
                messages.map((msg, index) => (
                  <Box
                    key={index}
                    p={3}
                    shadow="sm"
                    borderWidth="1px"
                    borderRadius="md"
                    bg="white"
                    borderColor="gray.200"
                  >
                    <Flex justify="space-between" align="center">
                      <Flex align="center">
                        <Avatar
                          size="sm"
                          name={msg.customer}
                          src="https://via.placeholder.com/40"
                          mr={3}
                        />
                        <Box>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color="gray.800"
                          >
                            {msg.customer}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {msg.message}
                          </Text>
                        </Box>
                      </Flex>
                      <Text fontSize="xs" color="gray.600">
                        {msg.date}
                      </Text>
                    </Flex>
                  </Box>
                ))
              )}
            </VStack>
          </Box>
        </Box>
      </SimpleGrid>
    </Container>
  );
}

export const Route = createFileRoute("/_layout/supplier/dashboard")({
  component: Dashboard,
});

export default Dashboard;