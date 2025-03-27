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
      { region: "US-EAST1", url: "https://us-east1-image-scraper-451516.cloudfunctions.net/main/fetch" },
      { region: "US-EAST4", url: "https://us-east4-image-scraper-451516.cloudfunctions.net/main/fetch" },
      { region: "US-WEST1", url: "https://us-west1-image-scraper-451516.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST4", url: "https://europe-west4-image-scraper-451516.cloudfunctions.net/main/fetch" },
      { region: "US-WEST4", url: "https://us-west4-image-proxy-453319.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST1", url: "https://europe-west1-image-proxy-453319.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-NORTH1", url: "https://europe-north1-image-proxy-453319.cloudfunctions.net/main/fetch" },
      { region: "ASIA-EAST1", url: "https://asia-east1-image-proxy-453319.cloudfunctions.net/main/fetch" },
      { region: "US-SOUTH1", url: "https://us-south1-gen-lang-client-0697423475.cloudfunctions.net/main/fetch" },
      { region: "US-WEST3", url: "https://us-west3-gen-lang-client-0697423475.cloudfunctions.net/main/fetch" },
      { region: "US-EAST5", url: "https://us-east5-gen-lang-client-0697423475.cloudfunctions.net/main/fetch" },
      { region: "ASIA-SOUTHEAST1", url: "https://asia-southeast1-gen-lang-client-0697423475.cloudfunctions.net/main/fetch" },
      { region: "US-WEST2", url: "https://us-west2-gen-lang-client-0697423475.cloudfunctions.net/main/fetch" },
      { region: "NORTHAMERICA-NORTHEAST2", url: "https://northamerica-northeast2-image-proxy2-453320.cloudfunctions.net/main/fetch" },
      { region: "SOUTHAMERICA-EAST1", url: "https://southamerica-east1-image-proxy2-453320.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST8", url: "https://europe-west8-icon-image3.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-SOUTHWEST1", url: "https://europe-southwest1-icon-image3.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST6", url: "https://europe-west6-icon-image3.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST3", url: "https://europe-west3-icon-image3.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST2", url: "https://europe-west2-icon-image3.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST9", url: "https://europe-west9-image-proxy2-453320.cloudfunctions.net/main/fetch" },
      { region: "MIDDLEEAST-WEST1", url: "https://me-west1-image-proxy4.cloudfunctions.net/main/fetch" },
      { region: "MIDDLEEAST-CENTRAL1", url: "https://me-central1-image-proxy4.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST12", url: "https://europe-west12-image-proxy4.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST10", url: "https://europe-west10-image-proxy4.cloudfunctions.net/main/fetch" },
      { region: "ASIA-NORTHEAST2", url: "https://asia-northeast2-image-proxy4.cloudfunctions.net/main/fetch" },
      { region: "NORTHAMERICA-NORTHEAST1", url: "https://northamerica-northeast1-proxy2-455013.cloudfunctions.net/main/fetch" },
    ],
    "AWS": [
      { region: "us-east-1", url: "https://us-east-1-aws-scraper.example.com" },
      { region: "eu-west-1", url: "https://eu-west-1-aws-scraper.invalid" },
    ],
    "Azure": [
      { region: "eastus", url: "https://prod-fetch.azurewebsites.net/api/HttpTrigger1?code=aW--Ht7EhrEfmS1BQLz4236XyYXlCK4G-70_1rl0Ot7zAzFuZIXBYA==" },
      { region: "westeurope", url: "https://westeurope-azure-scraper.broken" },
    ],
    "DigitalOcean": [
      { region: "nyc1", url: "https://nyc1-do-scraper.example.com" },
      { region: "ams3", url: "https://ams3-do-scraper.unreachable" },
    ],
    "DataProxy": [
      { region: "US-EAST4", url: "https://us-east4-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "SOUTHAMERICA-WEST1", url: "https://southamerica-west1-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "US-CENTRAL1", url: "https://us-central1-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "US-EAST1", url: "https://us-east1-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "US-EAST2", url: "https://us-east2-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "US-WEST1", url: "https://us-west1-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "US-WEST3", url: "https://us-west3-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "US-WEST4", url: "https://us-west4-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "NORTHAMERICA-NORTHEAST3", url: "https://northamerica-northeast3-proxy1-454912.cloudfunctions.net/main/fetch" },
      { region: "NORTHAMERICA-NORTHEAST2", url: "https://northamerica-northeast2-proxy2-455013.cloudfunctions.net/main/fetch" },
      { region: "US-CENTRAL1", url: "https://us-central1-proxy2-455013.cloudfunctions.net/main/fetch" },
      { region: "US-EAST5", url: "https://us-east5-proxy2-455013.cloudfunctions.net/main/fetch" },
      { region: "US-WEST2", url: "https://us-west2-proxy2-455013.cloudfunctions.net/main/fetch" },
      { region: "US-WEST6", url: "https://us-west6-proxy2-455013.cloudfunctions.net/main/fetch" },
      { region: "ASIA-SOUTHEAST1", url: "https://asia-southeast1-proxy2-455013.cloudfunctions.net/main/fetch" },
      { region: "AUSTRALIA-SOUTHEAST1", url: "https://australia-southeast1-proxy3-455013.cloudfunctions.net/main/fetch" },
      { region: "AUSTRALIA-SOUTHEAST2", url: "https://australia-southeast2-proxy3-455013.cloudfunctions.net/main/fetch" },
      { region: "SOUTHAMERICA-EAST1", url: "https://southamerica-east1-proxy3-455013.cloudfunctions.net/main/fetch" },
      { region: "SOUTHAMERICA-EAST2", url: "https://southamerica-east2-proxy3-455013.cloudfunctions.net/main/fetch" },
      { region: "SOUTHAMERICA-WEST1", url: "https://southamerica-west1-proxy3-455013.cloudfunctions.net/main/fetch" },
      { region: "US-SOUTH1", url: "https://us-south1-proxy3-455013.cloudfunctions.net/main/fetch" },
      { region: "ASIA-SOUTH1", url: "https://asia-south1-proxy3-455013.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-NORTH1", url: "https://europe-north1-proxy4-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-SOUTHWEST1", url: "https://europe-southwest1-proxy4-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST1", url: "https://europe-west1-proxy4-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST4", url: "https://europe-west4-proxy4-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST5", url: "https://europe-west5-proxy4-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST6", url: "https://europe-west6-proxy4-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST8", url: "https://europe-west8-proxy4-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-CENTRAL2", url: "https://europe-central2-proxy4-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST12", url: "https://europe-west12-proxy5-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST2", url: "https://europe-west2-proxy5-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST3", url: "https://europe-west3-proxy5-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST6", url: "https://europe-west6-proxy5-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST9", url: "https://europe-west9-proxy5-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST11", url: "https://europe-west11-proxy5-455014.cloudfunctions.net/main/fetch" },
      { region: "ASIA-NORTHEAST1", url: "https://asia-northeast1-proxy5-455014.cloudfunctions.net/main/fetch" },
      { region: "ASIA-EAST1", url: "https://asia-east1-proxy6-455014.cloudfunctions.net/main/fetch" },
      { region: "ASIA-EAST2", url: "https://asia-east2-proxy6-455014.cloudfunctions.net/main/fetch" },
      { region: "ASIA-NORTHEAST2", url: "https://asia-northeast2-proxy6-455014.cloudfunctions.net/main/fetch" },
      { region: "EUROPE-WEST10", url: "https://europe-west10-proxy6-455014.cloudfunctions.net/main/fetch" },
      { region: "MIDDLEEAST-CENTRAL1", url: "https://me-central1-proxy6-455014.cloudfunctions.net/main/fetch" },
      { region: "MIDDLEEAST-CENTRAL2", url: "https://me-central2-proxy6-455014.cloudfunctions.net/main/fetch" },
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