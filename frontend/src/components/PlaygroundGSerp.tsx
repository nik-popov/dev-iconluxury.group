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

// Proxy Data (with /fetch path)
const proxyData = {
  "Google Cloud": [
    { region: "SOUTHAMERICA-WEST1", url: "https://southamerica-west1-image-scraper-451516.cloudfunctions.net/main/fetch" },
    { region: "US-CENTRAL1", url: "https://us-central1-image-scraper-451516.cloudfunctions.net/main/fetch" },
    { region: "US-EAST1", url: "https://us-east1-image-scraper-451516.cloudfunctions.net/main/fetch" },
    // Add all Google Cloud URLs here
  ],
  "DataProxy": [
    { region: "US-EAST4", url: "https://us-east4-proxy1-454912.cloudfunctions.net/main/fetch" },
    { region: "SOUTHAMERICA-WEST1", url: "https://southamerica-west1-proxy1-454912.cloudfunctions.net/main/fetch" },
    { region: "US-CENTRAL1", url: "https://us-central1-proxy1-454912.cloudfunctions.net/main/fetch" },
    // Add all DataProxy URLs here
  ],
};

// Types
interface ApiResponse {
  endpoint: string;
  url: string; // Changed from "query" to "url"
  status: string;
  results?: any;
  timestamp: string;
  error?: string;
  details?: string;
}

const PlaygroundGSerp: React.FC = () => {
  const [url, setUrl] = useState<string>("https://www.google.com/search?q=flowers&udm=2"); // Default to full URL
  const [provider, setProvider] = useState<"Google Cloud" | "DataProxy">("DataProxy");
  const [selectedUrl, setSelectedUrl] = useState<string>(proxyData["DataProxy"][0].url); // Default to US-EAST4
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

  // Handle API request (POST only)
  const handleTestRequest = async () => {
    setIsLoading(true);
    setResponse("");

    try {
      const res = await fetch(selectedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }), // Send { "url": "<full_url>" }
      });

      const contentType = res.headers.get("content-type");
      let data: any;
      if (contentType?.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text(); // Fallback for non-JSON responses
      }

      const apiResponse: ApiResponse = {
        endpoint: selectedUrl,
        url, // Reflect the full URL in the response
        status: res.ok ? "success" : "error",
        results: res.ok ? data : undefined,
        timestamp: new Date().toISOString(),
        error: res.ok ? undefined : data.error || "Request failed",
        details: res.ok ? undefined : `Status: ${res.status}, Text: ${res.statusText}, Content-Type: ${contentType}`,
      };
      setResponse(JSON.stringify(apiResponse, null, 2));
    } catch (error) {
      const errorResponse: ApiResponse = {
        endpoint: selectedUrl,
        url,
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
            <FormLabel fontSize="sm">Search URL</FormLabel>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g., https://www.google.com/search?q=flowers&udm=2"
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
                isDisabled={!url.trim()}
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