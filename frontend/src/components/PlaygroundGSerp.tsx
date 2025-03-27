import React, { useState, useEffect } from "react";
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
  IconButton,
  Image,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

const proxyData = {
  "Google Cloud": [
    { region: "SOUTHAMERICA-WEST1", url: "https://southamerica-west1-image-scraper-451516.cloudfunctions.net/main/fetch" },
    { region: "US-CENTRAL1", url: "https://us-central1-image-scraper-451516.cloudfunctions.net/main/fetch" },
  ],
  "AWS": [
    { region: "us-east-1", url: "https://us-east-1-aws-scraper.example.com" },
  ],
  "Azure": [
    { region: "eastus", url: "https://prod-fetch.azurewebsites.net/api/HttpTrigger1?code=aW--Ht7EhrEfmS1BQLz4236XyYXlCK4G-70_1rl0Ot7zAzFuZIXBYA==" },
  ],
  "DigitalOcean": [
    { region: "nyc1", url: "https://nyc1-do-scraper.example.com" },
  ],
  "DataProxy": [
    { region: "US-EAST4", url: "https://us-east4-proxy1-454912.cloudfunctions.net/main/fetch" },
  ],
};

const PlaygroundGSerp: React.FC = () => {
  const [url, setUrl] = useState<string>("https://www.google.com/search?q=flowers&udm=2");
  const [provider, setProvider] = useState<string>("DataProxy");
  const [selectedUrl, setSelectedUrl] = useState<string>(proxyData["DataProxy"][0].url);
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [htmlPreview, setHtmlPreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    setRegionFilter("");
    setSelectedUrl(proxyData[newProvider][0].url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUrl(e.target.value);
  };

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
      console.log("API Response:", data);
      setResponse(JSON.stringify(data, null, 2));
      if (data.result) {
        console.log("Setting HTML preview:", data.result.substring(0, 100));
        setHtmlPreview(data.result);
      } else {
        console.log("No HTML content found in data.result");
      }
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const filtered = proxyData[provider].filter((proxy) =>
      proxy.region.toLowerCase().includes(regionFilter.toLowerCase())
    );
    if (filtered.length > 0) {
      if (!filtered.some((proxy) => proxy.url === selectedUrl)) {
        setSelectedUrl(filtered[0].url);
      }
    } else {
      setSelectedUrl("");
    }
  }, [provider, regionFilter]);

  return (
    <Box p={4} width="100%">
      <Text fontSize="lg" fontWeight="bold" mb={4}>API Playground</Text>
      <Box mb={6}>
        <Text fontSize="md" fontWeight="semibold" mb={2}>Test Parameters</Text>
        <Flex direction="column" gap={4}>
          <Flex gap={4} alignItems="flex-end">
            <FormControl flex="2">
              <FormLabel fontSize="sm">Search URL</FormLabel>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://www.google.com/search?q=flowers&udm=2"
                size="sm"
                isRequired
              />
            </FormControl>
            <FormControl flex="1">
              <FormLabel fontSize="sm">Provider</FormLabel>
              <Select value={provider} onChange={handleProviderChange} size="sm">
                {Object.keys(proxyData).map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </Select>
            </FormControl>
          </Flex>
          <Flex direction="row" gap={4} alignItems="flex-end">
            <FormControl flex="1">
              <FormLabel fontSize="sm">Endpoint URL</FormLabel>
              <Input
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                placeholder="Filter regions"
                size="sm"
                mb={2}
              />
              {proxyData[provider].filter((proxy) =>
                proxy.region.toLowerCase().includes(regionFilter.toLowerCase())
              ).length > 0 ? (
                <Select value={selectedUrl} onChange={handleUrlChange} size="sm">
                  {proxyData[provider]
                    .filter((proxy) => proxy.region.toLowerCase().includes(regionFilter.toLowerCase()))
                    .map((proxy) => (
                      <option key={proxy.url} value={proxy.url}>
                        {proxy.region} - {proxy.url}
                      </option>
                    ))}
                </Select>
              ) : (
                <Select isDisabled placeholder="No regions match the filter" size="sm" />
              )}
            </FormControl>
            <Box>
              <Tooltip label="Send test request">
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={handleTestRequest}
                  isLoading={isLoading}
                  isDisabled={!url.trim() || !selectedUrl}
                >
                  POST
                </Button>
              </Tooltip>
            </Box>
          </Flex>
        </Flex>
      </Box>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
        <GridItem>
          <Text fontSize="md" fontWeight="semibold" mb={2}>Response</Text>
          {isLoading ? (
            <Flex justify="center" align="center" h="400px">
              <Spinner size="xl" color="blue.500" />
            </Flex>
          ) : (
            <Textarea
              value={response}
              readOnly
              height="400px"
              bg="gray.700"
              color="white"
              placeholder="Response will appear here after testing"
              size="sm"
              resize="vertical"
            />
          )}
        </GridItem>
        <GridItem>
          <Flex align="center" justify="space-between" mb={2}>
            <Text fontSize="md" fontWeight="semibold">HTML Preview</Text>
            {htmlPreview && (
              <Flex align="center" gap={2}>
                <Image src="https://openm.ai/favicon.ico" alt="OpenM" boxSize="16px" />
                <Tooltip label="Open preview in new tab">
                  <IconButton
                    aria-label="Open preview"
                    icon={<ExternalLinkIcon />}
                    size="sm"
                    onClick={() => {
                      const newWindow = window.open("", "_blank");
                      if (newWindow) {
                        newWindow.document.write(htmlPreview);
                        newWindow.document.close();
                      } else {
                        alert("Popup blocked. Please allow popups for this site.");
                      }
                    }}
                  />
                </Tooltip>
              </Flex>
            )}
          </Flex>
          {htmlPreview && (
            <iframe
              srcDoc={htmlPreview}
              style={{ width: "100%", height: "400px", border: "1px solid #ccc" }}
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
        </GridItem>
      </Grid>
    </Box>
  );
};

export default PlaygroundGSerp;