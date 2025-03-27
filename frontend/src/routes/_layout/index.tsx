import { useState, useMemo } from "react";
import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  Divider,
  Flex,
  Switch,
} from "@chakra-ui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [ownedOnly, setOwnedOnly] = useState(true);
  const [activeFilter, setActiveFilter] = useState("serp");

  type Product = {
    id: string;
    name: string;
    type: string;
    description: string;
    owned: boolean;
    path: string;
  };

  const proxyProducts: Product[] = [
    // { id: "submit-form", name: "🧑‍💻 Scraper Submit Form", type: "SERP", description: "Submit files to Dev Scraper.", owned: true, path: "/scraping-api/submit-form/google-serp" },
    { id: "explore-serp", name: "📋 Scraper Jobs", type: "SERP", description: "View Scraper Files.", owned: true, path: "/scraping-api/explore" },
    { id: "icon-gpt", name: "🤖 IconGpt", type: "AI", description: "Use OpenAI and X models.", owned: true, path: "/ai/icongpt" },
    { id: "manage-proxy", name: "👺 Proxy Management", type: "SERP", description: "Manage Proxy Endpoints.", owned: true, path: "/scraping-api/search-proxies" },
    { id: "google-serp", name: "🔍 Google SERP Management", type: "SERP", description: "Scrape real-time Google search results.", owned: true, path: "/scraping-api/google-serp" },
    { id: "cettire", name: "🔍 Cettire", type: "SERP", description: "Scrape Cettire search results.", owned: true, path: "/scraping-api/cettire" },
  ];

  const filteredProducts = useMemo(() => {
    return proxyProducts.filter((product) => {
      const matchesFilter =
        activeFilter === "all" ||
        product.type.toLowerCase() === activeFilter.toLowerCase();
      const matchesOwnership = !ownedOnly || product.owned;
      return matchesFilter && matchesOwnership;
    });
  }, [activeFilter, ownedOnly]);

  return (
    <Container maxW="full" bg="gray.50" minH="100vh">
      {/* Filters & Toggle */}
      <Flex mt={6} gap={4} justify="space-between" align="center" flexWrap="wrap">
      <Flex align="center">
  <Text fontWeight="bold" mr={2} color="gray.800">My Tools</Text>
  <Switch 
    isChecked={ownedOnly} 
    onChange={() => setOwnedOnly((prev) => !prev)} 
    colorScheme="green"
    mr={4}
  />
</Flex>

        <Flex gap={2}>
  {["All", "SERP", "AI"].map((type) => (
    <Button
      key={type}
      size="md"
      fontWeight="bold"
      borderRadius="full"
      colorScheme={
        activeFilter === type.toLowerCase() || 
        (type === "All" && activeFilter === "all") ? "green" : "gray"
      }
      variant={
        activeFilter === type.toLowerCase() || 
        (type === "All" && activeFilter === "all") ? "solid" : "outline"
      }
      color={
        activeFilter === type.toLowerCase() || 
        (type === "All" && activeFilter === "all") ? "gray.800" : "gray.600"
      }
      onClick={() => setActiveFilter(type === "All" ? "all" : type.toLowerCase())}
    >
      {type}
    </Button>
  ))}
</Flex>
      </Flex>

      <Divider my={4} borderColor="gray.200" />

      <Flex mt={6} gap={6} justify="space-between">
        <Box flex="1">
          <VStack spacing={6} mt={6} align="stretch">
            {filteredProducts.length === 0 ? (
              <Text textAlign="center" fontSize="lg" color="gray.600">No products match this filter.</Text>
            ) : (
              filteredProducts.map((product) => (
                <Box 
                  key={product.id} 
                  p={5} 
                  shadow="md" 
                  borderWidth="1px" 
                  borderRadius="lg" 
                  bg="white"
                  borderColor="gray.200"
                >
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{product.name}</Text>
                  <Text fontSize="sm" color="gray.600">{product.description}</Text>
                  <Button 
                    mt={3} 
                    size="sm" 
                    colorScheme="blue" 
                    borderRadius="full" 
                    onClick={() => navigate({ to: product.path })}
                  >
                    Manage
                  </Button>
                </Box>
              ))
            )}
          </VStack>
        </Box>
      </Flex>
    </Container>
  );
}

export default Dashboard;