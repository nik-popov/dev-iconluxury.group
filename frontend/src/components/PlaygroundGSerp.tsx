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
  Grid,
  GridItem,
} from "@chakra-ui/react";

// Place the proxyData object here (as defined above)

const PlaygroundGSerp: React.FC = () => {
  const [url, setUrl] = useState<string>("https://www.google.com/search?q=flowers&udm=2");
  const [provider, setProvider] = useState<string>("DataProxy");
  const [selectedUrl, setSelectedUrl] = useState<string>(proxyData["DataProxy"][0].url);
  const [response, setResponse] = useState<string>("");
  const [htmlPreview, setHtmlPreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle provider change
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    setSelectedUrl(proxyData[newProvider][0].url);
  };

  // Handle URL change
  const handleUrlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUrl(e.target.value);
  };

  // Handle API request
  const handleTestRequest = async () => {
    setIsLoading(true);
    setResponse("");
    setHtmlPreview("");

    try {
      const res = await fetch(selectedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));

      // Load HTML result from data.results.result
      if (data.results && data.results.result) {
        setHtmlPreview(data.results.result);
      }
    } catch (error) {
      setResponse(`Error: ${error.message}`);
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
              {Object.keys(proxyData).map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
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

      {/* Response and Preview Section */}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
        <GridItem>
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
        </GridItem>
        <GridItem>
          <Text fontSize="md" fontWeight="semibold" mb={2}>
            HTML Preview
          </Text>
          {htmlPreview ? (
            <iframe
              srcDoc={htmlPreview}
              style={{ width: "100%", height: "300px", border: "1px solid #ccc" }}
              title="HTML Preview"
            />
          ) : (
            <Text>No preview available</Text>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
};

export default PlaygroundGSerp;