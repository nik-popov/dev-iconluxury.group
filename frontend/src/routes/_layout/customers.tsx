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
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Flex,
  Button,
} from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import { SearchIcon, ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { useState, useMemo } from "react";

// Reuse mock data fetching functions
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

export const Route = createFileRoute("/_layout/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  // Fetch customers and orders
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  // State for search and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"name" | "joined">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Calculate order count per customer
  const orderCountMap = useMemo(() => {
    return orders.reduce((acc, order) => {
      acc[order.customerId] = (acc[order.customerId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [orders]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Apply search filter
    if (searchTerm) {
      result = result.filter((customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") {
        return multiplier * a.name.localeCompare(b.name);
      } else {
        return multiplier * (new Date(a.joined).getTime() - new Date(b.joined).getTime());
      }
    });

    return result;
  }, [customers, searchTerm, sortField, sortDirection]);

  // Handle sort toggle
  const handleSort = (field: "name" | "joined") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      {/* Header */}
      <Box mb={4}>
        <Text fontSize="xl" fontWeight="bold" color="gray.800">
          Customers
        </Text>
      </Box>

      <Divider my={3} borderColor="gray.200" />

      {/* Search and Table */}
      <Box>
        <Flex mb={4} justify="space-between" align="center">
          <Text fontSize="md" fontWeight="bold" color="gray.800">
            All Customers
          </Text>
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <Icon as={SearchIcon} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg="white"
              borderColor="gray.200"
            />
          </InputGroup>
        </Flex>
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
                <Th>
                  <Button
  variant="ghost"
  onClick={() => handleSort("name")}
  rightIcon={
    sortField === "name" ? (
      sortDirection === "asc" ? (
        <ChevronUpIcon />
      ) : (
        <ChevronDownIcon />
      )
    ) : undefined 
  }
>
  Name
</Button>
                </Th>
                <Th>ID</Th>
                <Th>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("joined")}
                    rightIcon={
                        sortField === "joined" ? (
                        sortDirection === "asc" ? (
                            <ChevronUpIcon />
                        ) : (
                            <ChevronDownIcon />
                        )
                        ) : undefined // Changed from null to undefined
                    }
                    >
                    Joined Date
                    </Button>
                </Th>
                <Th>Order Count</Th>
              </Tr>
            </Thead>
            <Tbody>
              {customersLoading || ordersLoading ? (
                <Tr>
                  <Td colSpan={4} textAlign="center">
                    <Text fontSize="sm" color="gray.600">Loading...</Text>
                  </Td>
                </Tr>
              ) : filteredCustomers.length === 0 ? (
                <Tr>
                  <Td colSpan={4} textAlign="center">
                    <Text fontSize="sm" color="gray.600">
                      {searchTerm ? "No customers match your search." : "No customers found."}
                    </Text>
                  </Td>
                </Tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <Tr key={customer.id}>
                    <Td>{customer.name}</Td>
                    <Td>{customer.id}</Td>
                    <Td>{customer.joined}</Td>
                    <Td>{orderCountMap[customer.id] || 0}</Td>
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

export default CustomersPage;