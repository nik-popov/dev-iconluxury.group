import React, { useState } from "react";
import {
  Box,
  Text,
  Flex,
  Button,
  Input,
  Select,
  Textarea,
  Spinner,
  Tooltip,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";

// Proxy Data
const proxyData = {
  "Google Cloud": [
    { region: "SOUTHAMERICA-WEST1", url: "https://southamerica-west1-image-scraper-451516.cloudfunctions.net/main" },
    { region: "US-CENTRAL1", url: "https://us-central1-image-scraper-451516.cloudfunctions.net/main" },
    { region: "US-EAST1", url: "https://us-east1-image-scraper-451516.cloudfunctions.net/main" },
    // Add all Google Cloud URLs from your original list here
    { region: "NORTHAMERICA-NORTHEAST1", url: "https://northamerica-northeast1-proxy2-455013.cloudfunctions.net/main" },
  ],
  "DataProxy": [
    { region: "US-EAST4", url: "https://us-east4-proxy1-454912.cloudfunctions.net/main" },
    { region: "SOUTHAMERICA-WEST1", url: "https://southamerica-west1-proxy1-454912.cloudfunctions.net/main" },
    { region: "US-CENTRAL1", url: "https://us-central1-proxy1-454912.cloudfunctions.net/main" },
    // Add all DataProxy URLs from your original list here
    { region: "MIDDLEEAST-CENTRAL2", url: "https://me-central2-proxy6-455014.cloudfunctions.net/main" },
  ],
};

// Types
interface ApiResponse {
  endpoint: string;
  query: string;
  status: string;
  results?: any; // Adjust based on actual API response
  timestamp: string;
  error?: string;
}

const PlaygroundGSerp: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [provider, setProvider] = useState<"Google Cloud" | "DataProxy">("Google Cloud");
  const [selectedUrl, setSelectedUrl] = useState<string>(proxyData["Google Cloud"][1].url); // Default to US-CENTRAL1
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle provider change
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as "Google Cloud" | "DataProxy";
    setProvider(newProvider);
    setSelectedUrl(proxyData[newProvider][0].url); // Default to first URL of new provider
  };

  // Handle URL change
  const handleUrlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUrl(e.target.value);
  };

  // Handle API request
  const handleTestRequest = async () => {
    setIsLoading(true);
    setResponse(""); // Clear previous response

    try {
      const res = await fetch(selectedUrl, {
        method: "POST", // Adjust method as per your API (e.g., GET, POST)
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }), // Adjust payload structure as needed
      });

      const data = await res.json();
      const apiResponse: ApiResponse = {
        endpoint: selectedUrl,
        query,
        status: res.ok ? "success" : "error",
        results: res.ok ? data : undefined,
        timestamp: new Date().toISOString(),
        error: res.ok ? undefined : data.error || "Request failed",
      };
      setResponse(JSON.stringify(apiResponse, null, 2));
    } catch (error) {
      const errorResponse: ApiResponse = {
        endpoint: selectedUrl,
        query,
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message || "Network error",
      };
      setResponse(JSON.stringify(errorResponse, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={4} width="100%">
      {/* Header */}
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        API Playground
      </Text>

      {/* Test Parameters Section */}
      <Box mb={6}>
        <Text fontSize="md" fontWeight="semibold" mb={2}>
          Test Parameters
        </Text>
        <Flex direction={{ base: "column", md: "row" }} gap={4}>
          <FormControl flex="1" minW="200px">
            <FormLabel fontSize="sm">Search Query</FormLabel>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query"
              size="sm"
              isRequired
            />
          </FormControl>
          <FormControl flex="1" minW="200px">
            <FormLabel fontSize="sm">Provider</FormLabel>
            <Select value={provider} onChange={handleProviderChange} size="sm">
              <option value="Google Cloud">Google Cloud</option>
              <option value="DataProxy">DataProxy</option>
            </Select>
          </FormControl>
          <FormControl flex="1" minW="200px">
            <FormLabel fontSize="sm">Endpoint URL</FormLabel>
            <Select value={selectedUrl} onChange={handleUrlChange} size="sm">
              {proxyData[provider].map((proxy) => (
                <option key={proxy.url} value={proxy.url}>
                  {proxy.region} - {proxy.url}
                </option>
              ))}
            </Select>
          </FormControl>
          <Box alignSelf="flex-end">
            <Tooltip label="Send test request">
              <Button
                size="sm"
                colorScheme="blue"
                onClick={handleTestRequest}
                isLoading={isLoading}
                isDisabled={!query.trim()}
                mt={{ base: 0, md: 6 }}
              >
                Test
              </Button>
            </Tooltip>
          </Box>
        </Flex>
      </Box>

      {/* Response Section */}
      <Box>
        <Text fontSize="md" fontWeight="semibold" mb={2}>
          Response
        </Text>
        {isLoading ? (
          <Flex justify="center" align="center" h="200px">
            <Spinner size="xl" color="blue.500" />
          </Flex>
        ) : (
          <Textarea
            value={response}
            readOnly
            height="300px"
            bg="gray.700"
            color="white"
            placeholder="Response will appear here after testing"
            size="sm"
            resize="vertical"
          />
        )}
      </Box>
    </Box>
  );
};

export default PlaygroundGSerp;