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
    // Add all Google Cloud URLs here
  ],
  "DataProxy": [
    { region: "US-EAST4", url: "https://us-east4-proxy1-454912.cloudfunctions.net/main" },
    { region: "SOUTHAMERICA-WEST1", url: "https://southamerica-west1-proxy1-454912.cloudfunctions.net/main" },
    { region: "US-CENTRAL1", url: "https://us-central1-proxy1-454912.cloudfunctions.net/main" },
    // Add all DataProxy URLs here
  ],
};

// Types
interface ApiResponse {
  endpoint: string;
  query: string;
  status: string;
  results?: any;
  timestamp: string;
  error?: string;
  details?: string; // For additional error info
}

const PlaygroundGSerp: React.FC = () => {
  const [query, setQuery] = useState<string>("flowers"); // Default for testing
  const [provider, setProvider] = useState<"Google Cloud" | "DataProxy">("DataProxy");
  const [selectedUrl, setSelectedUrl] = useState<string>(proxyData["DataProxy"][0].url); // Default to US-EAST4
  const [method, setMethod] = useState<"POST" | "GET">("POST"); // Allow method selection
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle provider change
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as "Google Cloud" | "DataProxy";
    setProvider(newProvider);
    setSelectedUrl(proxyData[newProvider][0].url);
  };

  // Handle URL change
  const handleUrlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUrl(e.target.value);
  };

  // Handle method change
  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMethod(e.target.value as "POST" | "GET");
  };

  // Handle API request
  const handleTestRequest = async () => {
    setIsLoading(true);
    setResponse("");

    try {
      let res: Response;
      if (method === "POST") {
        res = await fetch(selectedUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }), // Sending { "query": "flowers" }
        });
      } else {
        res = await fetch(`${selectedUrl}?query=${encodeURIComponent(query)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const apiResponse: ApiResponse = {
        endpoint: selectedUrl,
        query,
        status: res.ok ? "success" : "error",
        results: res.ok ? data : undefined,
        timestamp: new Date().toISOString(),
        error: res.ok ? undefined : data.error || "Request failed",
        details: res.ok ? undefined : `Status: ${res.status}, Text: ${res.statusText}`,
      };
      setResponse(JSON.stringify(apiResponse, null, 2));
    } catch (error) {
      const errorResponse: ApiResponse = {
        endpoint: selectedUrl,
        query,
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message || "Network error",
        details: error instanceof Error ? error.stack : undefined,
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
              placeholder="e.g., https://www.google.com/search?q=flowers&udm=2 or flowers"
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
          <FormControl flex="1" minW="100px">
            <FormLabel fontSize="sm">Method</FormLabel>
            <Select value={method} onChange={handleMethodChange} size="sm">
              <option value="POST">POST</option>
              <option value="GET">GET</option>
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