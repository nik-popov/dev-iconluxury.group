import React, { useState, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  Container,
  Box,
  Text,
  Flex,
  Tabs,
  TabList,
  Input,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Button,
  Card,
  Link,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@chakra-ui/react";
import useCustomToast from "../../../../hooks/useCustomToast";

interface JobDetails {
  id: number;
  inputFile: string;
  imageStart: string;
  fileStart: string;
  fileEnd?: string;
  resultFile: string;
  fileLocationUrl: string;
  logFileUrl: string | null;
  user: string;
  rec: number;
  img: number;
  apiUsed: string;
  imageEnd?: string;
  results: ResultItem[];
  records: RecordItem[];
}

interface ResultItem {
  resultId: number;
  entryId: number;
  imageUrl: string;
  imageDesc: string;
  imageSource: string;
  createTime: string;
  imageUrlThumbnail: string;
  sortOrder: number;
  imageIsFashion: number;
  aiCaption: string | null;
  aiJson: string | null;
  aiLabel: string | null;
}

interface RecordItem {
  entryId: number;
  fileId: number;
  excelRowId: number;
  productModel: string;
  productBrand: string;
  createTime: string;
  step1: string | null;
  step2: string | null;
  step3: string | null;
  step4: string | null;
  completeTime: string | null;
  productColor: string;
  productCategory: string;
  excelRowImageRef: string | null;
}

interface LogDisplayProps {
  logUrl: string | null;
}

const LogDisplay: React.FC<LogDisplayProps> = ({ logUrl }) => {
  const [logContent, setLogContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useCustomToast();

  useEffect(() => {
    const fetchLog = async () => {
      if (!logUrl) return;
      setIsLoading(true);
      try {
        const response = await fetch(logUrl);
        if (!response.ok) throw new Error('Failed to fetch log');
        const text = await response.text();
        setLogContent(text);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        showToast("Log Fetch Error", errorMessage, "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLog();
  }, [logUrl, showToast]);

  if (isLoading) return <Spinner color="green.300" />;
  if (error) return <Text color="red.500">{error}</Text>;
  if (!logContent) return <Text color="gray.600">No log content available</Text>;

  return (
    <Box
      maxH="300px"
      w="full"
      overflowY="auto"
      overflowX="auto"
      bg="gray.50"
      color="gray.800"
      p={2}
      borderRadius="md"
      border="1px solid"
      borderColor="gray.200"
    >
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
        }}
      >
        {logContent}
      </pre>
    </Box>
  );
};

interface OverviewTabProps {
  job: JobDetails;
  sortBy: "match" | "linesheet" | null;
  setSortBy: (value: "match" | "linesheet" | null) => void;
  fetchJobData: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveTab: (index: number) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  job,
  sortBy,
  setSortBy,
  fetchJobData,
  setSearchQuery,
  setActiveTab,
}) => {
  const [isRestarting, setIsRestarting] = useState(false);
  const [isCreatingXLS, setIsCreatingXLS] = useState(false);
  const showToast = useCustomToast();

  const [sortConfig, setSortConfig] = useState<{
    key: "domain" | "totalResults" | "positiveSortOrderCount";
    direction: "ascending" | "descending";
  }>({
    key: "positiveSortOrderCount",
    direction: "descending",
  });

  const getDomain = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, "");
    } catch {
      return "unknown";
    }
  };

  const domainData = job.results.reduce((acc, result) => {
    const domain = getDomain(result.imageSource);
    if (!acc[domain]) {
      acc[domain] = { totalResults: 0, positiveSortOrderCount: 0 };
    }
    acc[domain].totalResults += 1;
    if (result.sortOrder > 0) acc[domain].positiveSortOrderCount += 1;
    return acc;
  }, {} as Record<string, { totalResults: number; positiveSortOrderCount: number }>);

  const topDomains = Object.entries(domainData)
    .map(([domain, data]) => ({
      domain,
      totalResults: data.totalResults,
      positiveSortOrderCount: data.positiveSortOrderCount,
    }))
    .sort((a, b) => b.positiveSortOrderCount - a.positiveSortOrderCount)
    .slice(0, 20);

  const sortedTopDomains = [...topDomains].sort((a, b) => {
    if (sortConfig.key === "domain") {
      const aValue = a.domain.toLowerCase();
      const bValue = b.domain.toLowerCase();
      return sortConfig.direction === "ascending"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (sortConfig.key === "totalResults") {
      return sortConfig.direction === "ascending"
        ? a.totalResults - b.totalResults
        : b.totalResults - a.totalResults;
    } else if (sortConfig.key === "positiveSortOrderCount") {
      return sortConfig.direction === "ascending"
        ? a.positiveSortOrderCount - b.positiveSortOrderCount
        : b.positiveSortOrderCount - a.positiveSortOrderCount;
    }
    return 0;
  });

  const handleSort = (key: "domain" | "totalResults" | "positiveSortOrderCount") => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "ascending" ? "descending" : "ascending",
        };
      }
      return { key, direction: "ascending" };
    });
  };

  const handleDomainClick = (domain: string) => {
    setSearchQuery(domain);
    setActiveTab(2);
  };

  function handleDevRestart(fileId = 194) {
    return async (setIsRestarting, showToast, fetchJobData) => {
      setIsRestarting(true);
      showToast("Restart Initiated", "Restarting job in development mode", "info");
  
      try {
        const response = await fetch(
          `https://dev-image-distro.popovtech.com/restart-failed-batch/?file_id_db=${fileId}`,
          {
            method: "POST",
            headers: {
              "Accept": "application/json",
            },
          }
        );
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        setIsRestarting(false);
        showToast("Restart Complete", data.message, "success"); // e.g., "Processing restart initiated for FileID: 194"
        fetchJobData(); // Refresh job data after success
      } catch (error) {
        setIsRestarting(false);
        showToast("Restart Failed", `Error: ${error.message}`, "error");
      }
    };
  }

  const handleCreateXLS = () => {
    setIsCreatingXLS(true);
    showToast("XLS Creation Started", "Generating XLS file", "info");
    setTimeout(() => {
      setIsCreatingXLS(false);
      showToast("XLS Created", "XLS file generated successfully", "success");
    }, 2000);
  };

  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Job Overview</Text>
        <Flex gap={3}>
          <Button size="sm" colorScheme="red" onClick={handleDevRestart} isLoading={isRestarting}>
            Dev Restart
          </Button>
          <Button size="sm" colorScheme="blue" onClick={handleCreateXLS} isLoading={isCreatingXLS}>
            Create XLS File
          </Button>
          <Button
            size="sm"
            colorScheme={sortBy === "linesheet" ? "blue" : "gray"}
            onClick={() => setSortBy(sortBy === "linesheet" ? null : "linesheet")}
          >
            Sort by Linesheet Pic
          </Button>
        </Flex>
      </Flex>

      <Box mb={6}>
        <Stat>
          <StatLabel color="gray.600">Job ID</StatLabel>
          <StatNumber color="gray.800">{job.id}</StatNumber>
        </Stat>
        <Stat mt={4}>
          <StatLabel color="gray.600">Input File</StatLabel>
          <StatHelpText wordBreak="break-all">
            <Link href={job.fileLocationUrl} isExternal color="green.300">
              {job.inputFile}
            </Link>
          </StatHelpText>
        </Stat>
        <Stat mt={4}>
          <StatLabel color="gray.600">Status</StatLabel>
          <StatNumber>
            <Badge colorScheme={job.fileEnd ? "green" : "yellow"}>
              {job.fileEnd ? "Completed" : "Pending"}
            </Badge>
          </StatNumber>
        </Stat>
        {job.fileEnd && (
          <Stat mt={4}>
            <StatLabel color="gray.600">Processing Duration</StatLabel>
            <StatNumber color="gray.800">
              {(
                (new Date(job.fileEnd).getTime() - new Date(job.fileStart).getTime()) /
                1000 /
                60
              ).toFixed(2)}{" "}
              minutes
            </StatNumber>
          </Stat>
        )}
        <Stat mt={4}>
          <StatLabel color="gray.600">API Used</StatLabel>
          <StatHelpText color="gray.800">{job.apiUsed}</StatHelpText>
        </Stat>
        <Stat mt={4}>
          <StatLabel color="gray.600">Total Results</StatLabel>
          <StatNumber color="gray.800">{job.results.length}</StatNumber>
        </Stat>
      </Box>

      {job.results.length > 0 && (
        <Box mt={6}>
          <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">
            Top Domains by Positive Sort Orders (Top 20)
          </Text>
          <Table variant="simple" size="sm" colorScheme="blue">
            <Thead bg="gray.100">
              <Tr>
                <Th onClick={() => handleSort("domain")} cursor="pointer" color="gray.800">
                  Domain{" "}
                  {sortConfig.key === "domain" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th onClick={() => handleSort("totalResults")} cursor="pointer" color="gray.800">
                  Total Results{" "}
                  {sortConfig.key === "totalResults" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th onClick={() => handleSort("positiveSortOrderCount")} cursor="pointer" color="gray.800">
                  Positive Sort Orders Count{" "}
                  {sortConfig.key === "positiveSortOrderCount" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedTopDomains.map(({ domain, totalResults, positiveSortOrderCount }) => (
                <Tr key={domain}>
                  <Td>
                    <Text
                      color="green.300"
                      cursor="pointer"
                      onClick={() => handleDomainClick(domain)}
                      _hover={{ textDecoration: "underline" }}
                    >
                      {domain}
                    </Text>
                  </Td>
                  <Td color="gray.800">{totalResults}</Td>
                  <Td color="gray.800">{positiveSortOrderCount}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

const UsageTab = ({ job }: { job: JobDetails }) => {
  const totalRecords = job.records.length;
  const completedRecords = job.records.filter((record) => record.completeTime).length;
  const pendingRecords = totalRecords - completedRecords;
  const totalImages = job.results.length;
  const imagesPerRecord = totalRecords > 0 ? Math.round(totalImages / totalRecords) : 'N/A';
  const totalRequests = totalRecords;
  const successfulRequests = job.records.filter((record) =>
    job.results.some((result) => result.entryId === record.entryId)
  ).length;
  const successRate = totalRequests > 0 ? `${((successfulRequests / totalRequests) * 100).toFixed(1)}%` : 'N/A';

  const calculateAvgResponseTime = (): string => {
    const completedRecordsWithTimes = job.records.filter(
      (record) => record.createTime && record.completeTime
    );
    if (completedRecordsWithTimes.length === 0) return 'N/A';
    const totalDuration = completedRecordsWithTimes.reduce((sum, record) => {
      const start = new Date(record.createTime!).getTime();
      const end = new Date(record.completeTime!).getTime();
      return sum + (end - start);
    }, 0);
    const avgDurationSec = (totalDuration / completedRecordsWithTimes.length / 1000).toFixed(2);
    return `${avgDurationSec} seconds`;
  };
  const avgResponseTime = calculateAvgResponseTime();

  return (
    <Box p={4} bg="white">
      <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.800">Usage Statistics</Text>
      <Flex direction="column" gap={6}>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Total Records</StatLabel>
              <StatNumber color="gray.800">{totalRecords}</StatNumber>
            </Stat>
            <Stat mt={4}>
              <StatLabel color="gray.600">Completed Records</StatLabel>
              <StatNumber color="gray.800">{completedRecords}</StatNumber>
            </Stat>
            <Stat mt={4}>
              <StatLabel color="gray.600">Pending Records</StatLabel>
              <StatNumber color="gray.800">{pendingRecords}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Total Images Scraped</StatLabel>
              <StatNumber color="gray.800">{totalImages}</StatNumber>
            </Stat>
            <Stat mt={4}>
              <StatLabel color="gray.600">Average Images per Record</StatLabel>
              <StatNumber color="gray.800">{imagesPerRecord}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">Scraping Metrics</Text>
            <Table variant="simple" size="sm" colorScheme="blue">
              <Thead bg="gray.100">
                <Tr>
                  <Th color="gray.800">Metric</Th>
                  <Th color="gray.800">Value</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td color="gray.800">Total Requests</Td>
                  <Td color="gray.800">{totalRequests}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.800">Successful Requests</Td>
                  <Td color="gray.800">{successfulRequests}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.800">Success Rate</Td>
                  <Td color="gray.800">{successRate}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.800">Average Response Time</Td>
                  <Td color="gray.800">{avgResponseTime}</Td>
                </Tr>
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </Flex>
    </Box>
  );
};

interface ResultsTabProps {
  job: JobDetails;
  sortBy: "match" | "linesheet" | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ job, sortBy, searchQuery, setSearchQuery }) => {
  const showToast = useCustomToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 500;

  const query = (searchQuery || "").trim().toLowerCase();

  const filteredResults = job.results.filter((result) =>
    (result.imageDesc || "").toLowerCase().includes(query) ||
    (result.imageSource || "").toLowerCase().includes(query) ||
    (result.imageUrl || "").toLowerCase().includes(query)
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "match" && query) {
      const aScore = (a.imageDesc || "").toLowerCase().indexOf(query);
      const bScore = (b.imageDesc || "").toLowerCase().indexOf(query);
      return aScore === -1 ? 1 : bScore === -1 ? -1 : aScore - bScore;
    } else if (sortBy === "linesheet") {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
    return 0;
  });

  const filteredRecords = job.records.filter((record) =>
    (record.productModel || "").toLowerCase().includes(query) ||
    (record.productBrand || "").toLowerCase().includes(query) ||
    (record.excelRowId?.toString() || "").toLowerCase().includes(query)
  );

  const totalResults = sortedResults.length;
  const totalPages = query ? Math.ceil(totalResults / itemsPerPage) : 1;
  const startIndex = query ? (currentPage - 1) * itemsPerPage : 0;
  const paginatedResults = query ? sortedResults.slice(startIndex, startIndex + itemsPerPage) : sortedResults;

  const totalRecords = filteredRecords.length;
  const totalImages = job.results.length;
  const totalAllRecords = job.records.length;

  const hasThumbnails = filteredRecords.some((record) => record.excelRowImageRef);

  const shortenUrl = (url: string) => {
    if (!url) return "";
    let cleanedUrl = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    if (cleanedUrl.length <= 22) return cleanedUrl;
    return `${cleanedUrl.slice(0, 12)}...${cleanedUrl.slice(-10)}`;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Box p={4} bg="white">
      <Flex
        justify="space-between"
        align="center"
        mb={4}
        position="sticky"
        top="0"
        bg="white"
        zIndex="10"
        py={5}
        borderBottom="1px solid"
        borderColor="gray.200"
        flexWrap="wrap"
        gap={3}
      >
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Job Results</Text>
        <Input
          placeholder="Search by description, source, model, brand, etc..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onPaste={(e) => {
            const pastedText = e.clipboardData.getData("text");
            setSearchQuery(pastedText);
            e.preventDefault();
          }}
          width="300px"
          borderColor="green.300"
          _focus={{ borderColor: "green.300" }}
          color="gray.800"
          bg="white"
        />
      </Flex>
      <Flex direction="column" gap={6}>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            {query ? (
              <Box>
                <Stat>
                  <StatLabel color="gray.600">Filtered Results</StatLabel>
                  <StatNumber color="gray.800">{totalResults} images</StatNumber>
                  <StatHelpText color="gray.600">out of {totalImages} total</StatHelpText>
                </Stat>
                <Stat mt={4}>
                  <StatLabel color="gray.600">Filtered Records</StatLabel>
                  <StatNumber color="gray.800">{totalRecords} records</StatNumber>
                  <StatHelpText color="gray.600">out of {totalAllRecords} total</StatHelpText>
                </Stat>
              </Box>
            ) : (
              <>
                <Stat>
                  <StatLabel color="gray.600">Result File</StatLabel>
                  <Link href={job.resultFile} isExternal color="green.300">
                    {job.inputFile}
                  </Link>
                </Stat>
                <Stat mt={4}>
                  <StatLabel color="gray.600">Total Records</StatLabel>
                  <StatNumber color="gray.800">{totalAllRecords}</StatNumber>
                </Stat>
                <Stat mt={4}>
                  <StatLabel color="gray.600">Total Images</StatLabel>
                  <StatNumber color="gray.800">{totalImages}</StatNumber>
                </Stat>
              </>
            )}
          </CardBody>
        </Card>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">Details</Text>
            <Accordion allowToggle defaultIndex={[0, 1]}>
              <AccordionItem>
                <AccordionButton bg="gray.100" _expanded={{ bg: "gray.200" }}>
                  <Box flex="1" textAlign="left" color="green.300">Results ({totalResults})</Box>
                  <AccordionIcon color="green.300" />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Table variant="simple" size="sm" colorScheme="blue">
                    <Thead bg="gray.100">
                      <Tr>
                        <Th w="60px" color="gray.800">Preview</Th>
                        <Th w="80px" color="gray.800">Result ID</Th>
                        <Th w="80px" color="gray.800">Entry ID</Th>
                        <Th w="120px" color="gray.800">Image URL</Th>
                        <Th w="120px" color="gray.800">Description</Th>
                        <Th w="120px" color="gray.800">Source</Th>
                        <Th w="80px" color="gray.800">Sort Order</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedResults.map((result) => (
                        <Tr key={result.resultId}>
                          <Td w="60px">
                            <Image
                              src={result.imageUrlThumbnail || ""}
                              alt={result.imageDesc || "No description"}
                              maxW="80px"
                              maxH="80px"
                              objectFit="cover"
                              fallback={<Text fontSize="xs" color="gray.600">No image</Text>}
                            />
                          </Td>
                          <Td w="80px" color="gray.800">{result.resultId || "N/A"}</Td>
                          <Td w="80px" color="gray.800">{result.entryId || "N/A"}</Td>
                          <Td w="120px">
                            <a href={result.imageUrl || "#"} target="_blank" rel="noopener noreferrer">
                              <Text color="green.300">{shortenUrl(result.imageUrl)}</Text>
                            </a>
                          </Td>
                          <Td w="120px" color="gray.800">{result.imageDesc || "N/A"}</Td>
                          <Td w="120px">
                            <a href={result.imageSource || "#"} target="_blank" rel="noopener noreferrer">
                              <Text color="green.300">{shortenUrl(result.imageSource)}</Text>
                            </a>
                          </Td>
                          <Td w="80px" color="gray.800">{result.sortOrder || "0"}</Td>
                        </Tr>
                      ))}
                      {paginatedResults.length === 0 && (
                        <Tr>
                          <Td colSpan={7} textAlign="center" color="gray.600">
                            No results match your search query.
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem>
                <AccordionButton bg="gray.100" _expanded={{ bg: "gray.200" }}>
                  <Box flex="1" textAlign="left" color="green.300">Records ({totalRecords})</Box>
                  <AccordionIcon color="green.300" />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Table variant="simple" size="sm" colorScheme="blue">
                    <Thead bg="gray.100">
                      <Tr>
                        {hasThumbnails && <Th w="60px" color="gray.800">Excel Picture</Th>}
                        <Th w="80px" color="gray.800">Entry ID</Th>
                        <Th w="80px" color="gray.800">File ID</Th>
                        <Th w="80px" color="gray.800">Excel Row ID</Th>
                        <Th w="120px" color="gray.800">Style #</Th>
                        <Th w="120px" color="gray.800">Brand</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredRecords.map((record) => (
                        <Tr key={record.entryId}>
                          {hasThumbnails && (
                            <Td w="60px">
                              {record.excelRowImageRef ? (
                                <Image
                                  src={record.excelRowImageRef}
                                  alt={`Thumbnail for ${record.productModel || "Record ID " + record.entryId}`}
                                  maxW="80px"
                                  maxH="80px"
                                  objectFit="cover"
                                  cursor="pointer"
                                  onClick={() => {
                                    if (record.excelRowImageRef) {
                                      window.open(record.excelRowImageRef, "_blank");
                                    }
                                  }}
                                  onError={(e) => {
                                    showToast(
                                      "Image Load Failed",
                                      `Failed to load S3 image: ${record.excelRowImageRef}`,
                                      "warning"
                                    );
                                    e.currentTarget.style.display = "none";
                                  }}
                                  fallback={<Text fontSize="xs" color="gray.600">No picture</Text>}
                                  loading="lazy"
                                />
                              ) : (
                                <Text fontSize="xs" color="gray.600">No picture</Text>
                              )}
                            </Td>
                          )}
                          <Td w="80px" color="gray.800">{record.entryId || "N/A"}</Td>
                          <Td w="80px" color="gray.800">{record.fileId || "N/A"}</Td>
                          <Td w="80px" color="gray.800">{record.excelRowId || "N/A"}</Td>
                          <Td w="120px" color="gray.800">{record.productModel || "N/A"}</Td>
                          <Td w="120px" color="gray.800">{record.productBrand || "N/A"}</Td>
                        </Tr>
                      ))}
                      {filteredRecords.length === 0 && (
                        <Tr>
                          <Td colSpan={hasThumbnails ? 6 : 5} textAlign="center" color="gray.600">
                            No records match your search query.
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            {query && totalPages > 1 && (
              <Flex justify="center" mt={4} gap={2} align="center">
                <Button
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  isDisabled={currentPage === 1}
                  colorScheme="blue"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? "solid" : "outline"}
                    colorScheme="blue"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  isDisabled={currentPage === totalPages}
                  colorScheme="blue"
                >
                  Next
                </Button>
                <Text fontSize="sm" color="gray.600">
                  Page {currentPage} of {totalPages}
                </Text>
              </Flex>
            )}
          </CardBody>
        </Card>
      </Flex>
    </Box>
  );
};

const LogsTab = ({ job }: { job: JobDetails }) => {
  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Logs</Text>
        {job.logFileUrl && (
          <Button
            size="sm"
            colorScheme="blue"
            onClick={() => window.open(job.logFileUrl as string, '_blank')}
          >
            Download Log File
          </Button>
        )}
      </Flex>
      <Flex direction="column" gap={6}>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">Timeline Events</Text>
            <Table variant="simple" size="sm" colorScheme="blue">
              <Thead bg="gray.100">
                <Tr>
                  <Th color="gray.800">Event</Th>
                  <Th color="gray.800">Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td color="gray.800">File Start</Td>
                  <Td color="gray.800">{new Date(job.fileStart).toLocaleString()}</Td>
                </Tr>
                {job.fileEnd && (
                  <Tr>
                    <Td color="gray.800">File Roughly</Td>
                    <Td color="gray.800">{new Date(job.fileEnd).toLocaleString()}</Td>
                  </Tr>
                )}
                <Tr>
                  <Td color="gray.800">Image Start</Td>
                  <Td color="gray.800">{new Date(job.imageStart).toLocaleString()}</Td>
                </Tr>
                {job.imageEnd && (
                  <Tr>
                    <Td color="gray.800">Image End</Td>
                    <Td color="gray.800">{new Date(job.imageEnd).toLocaleString()}</Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">Log File Preview</Text>
            <LogDisplay logUrl={job.logFileUrl} />
          </CardBody>
        </Card>
      </Flex>
    </Box>
  );
};

interface SearchRowsTabProps {
  job: JobDetails;
}

const SearchRowsTab: React.FC<SearchRowsTabProps> = ({ job }) => {
  const showToast = useCustomToast();
  const [showFileDetails, setShowFileDetails] = useState(true);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "ascending" | "descending";
  }>({ key: null, direction: "ascending" });

  useEffect(() => {
    const maxImages = showResultDetails ? 1 : 5;
    setNumImages((prev) => (prev > maxImages ? maxImages : prev));
  }, [showResultDetails]);

  const getImagesForEntry = (entryId: number, limit: number): ResultItem[] => {
    const filteredResults = job.results.filter((r) => r.entryId === entryId && r.sortOrder > 0);
    return [...filteredResults].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, limit);
  };

  const getPositiveSortCountForEntry = (entryId: number): number => {
    return job.results.filter((r) => r.entryId === entryId && r.sortOrder > 0).length;
  };

  const getTotalImageCountForEntry = (entryId: number): number => {
    return job.results.filter((r) => r.entryId === entryId).length;
  };

  const shortenUrl = (url: string): string => {
    if (!url) return "";
    let cleanedUrl = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    if (cleanedUrl.length <= 22) return cleanedUrl;
    if (cleanedUrl.length <= 40)
      return `${cleanedUrl.slice(0, 12)}...${cleanedUrl.slice(-10)}`;
    else
      return `${cleanedUrl.slice(0, 20)}...${cleanedUrl.slice(-20)}`;
  };

  const googleSearch = (model: string): string =>
    `https://www.google.com/search?q=${encodeURIComponent(model || "")}&udm=2`;
  const googleSearchBrandModelUrl = (model: string, brand: string): string =>
    `https://www.google.com/search?q=${encodeURIComponent(`${brand || ""} ${model || ""}`)}&udm=2`;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, url: string) => {
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleIncreaseImages = () => {
    setShowResultDetails(false);
    const maxImages = showResultDetails ? 1 : 5;
    setNumImages((prev) => Math.min(prev + 1, maxImages));
  };

  const handleDecreaseImages = () => {
    setNumImages((prev) => Math.max(prev - 1, 1));
  };

  const handleRowIdClick = (e: React.MouseEvent<HTMLElement, MouseEvent>, productModel: string) => {
    e.preventDefault();
    const url = `${window.location.pathname}?activeTab=2&search=${encodeURIComponent(productModel || "")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      const newDirection = prev.key === key && prev.direction === "ascending" ? "descending" : "ascending";
      return { key, direction: newDirection };
    });
  };

  const hasPositiveSortImages = job.records.some((record) => getPositiveSortCountForEntry(record.entryId) > 0);

  const displayedRecords = hideEmptyRows && hasPositiveSortImages
    ? job.records.filter((record) => getPositiveSortCountForEntry(record.entryId) > 0)
    : job.records;

  const sortedRecords = [...displayedRecords].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aValue: any, bValue: any;
    if (sortConfig.key === "positiveSortCount") {
      aValue = getPositiveSortCountForEntry(a.entryId);
      bValue = getPositiveSortCountForEntry(b.entryId);
    } else if (sortConfig.key === "totalImageCount") {
      aValue = getTotalImageCountForEntry(a.entryId);
      bValue = getTotalImageCountForEntry(b.entryId);
    } else {
      aValue = a[sortConfig.key as keyof RecordItem] || "";
      bValue = b[sortConfig.key as keyof RecordItem] || "";
    }
    if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
    return 0;
  });

  const hasThumbnails = sortedRecords.some((record) => record.excelRowImageRef);

  return (
    <Box p={4} bg="white">
      <Flex
        justify="space-between"
        align="center"
        mb={4}
        position="sticky"
        top="0"
        bg="white"
        zIndex="10"
        py={5}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Text fontSize="lg" fontWeight="bold" color="gray.800">File Rows ({sortedRecords.length})</Text>
        <Flex gap={3}>
          <Button
            borderBottom="2px solid"
            borderColor="green.200"
            size="sm"
            colorScheme="blue"
            onClick={() => {
              setShowResultDetails(!showResultDetails);
              
            }}
          >
            {showResultDetails ? "- Picture Details" : "+ Picture Details"}
          </Button>
          <Button
            borderBottom="2px solid"
            borderColor="green.200"
            size="sm"
            colorScheme="blue"
            onClick={() => {
              setShowFileDetails(!showFileDetails);
             
            }}
          >
            {showFileDetails ? "- File Details" : "+ File Details"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (job.records.length > 0) {
                setHideEmptyRows(!hideEmptyRows);
                
              }
            }}
            colorScheme={job.records.length === 0 ? "gray" : "blue"}
            variant={job.records.length === 0 ? "outline" : "solid"}
          >
            {hideEmptyRows ? "Show All Rows" : "Hide Empty Rows"}
          </Button>
          <Flex align="center" gap={2}>
            <Button size="sm" onClick={handleDecreaseImages} isDisabled={numImages <= 1} colorScheme="blue">
              -
            </Button>
            <Text color="gray.800">{numImages}</Text>
            <Button
              size="sm"
              onClick={handleIncreaseImages}
              isDisabled={numImages >= (showResultDetails ? 1 : 5)}
              colorScheme="blue"
            >
              +
            </Button>
          </Flex>
        </Flex>
      </Flex>

      <Card shadow="md" borderWidth="1px" bg="white">
        <CardBody p={0}>
          <Table
            variant="simple"
            size="sm"
            borderWidth="1px"
            borderColor="gray.200"
            colorScheme="blue"
            sx={{
              "td, th": {
                border: "1px solid",
                borderColor: "gray.200",
                p: 2,
                verticalAlign: "middle",
              },
            }}
          >
            <Thead bg="gray.100">
              <Tr>
                {showFileDetails && hasThumbnails && (
                  <Th w="80px" bg="gray.200" color="gray.800">
                    Excel Picture
                  </Th>
                )}
                {Array.from({ length: numImages }).map((_, index) => (
                  <React.Fragment key={`header-${index}`}>
                    <Th w="100px" color="gray.800">Picture {index + 1}</Th>
                    {showResultDetails && (
                      <Th w="200px" bg="gray.200" color="gray.800">
                        Picture Detail {index + 1}
                      </Th>
                    )}
                  </React.Fragment>
                ))}
                <Th w="90px" onClick={() => handleSort("excelRowId")} cursor="pointer" color="gray.800">
                  Row #{" "}
                  {sortConfig.key === "excelRowId" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="150px" onClick={() => handleSort("productModel")} cursor="pointer" color="gray.800">
                  Style #{" "}
                  {sortConfig.key === "productModel" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="150px" onClick={() => handleSort("productBrand")} cursor="pointer" color="gray.800">
                  Brand{" "}
                  {sortConfig.key === "productBrand" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                {showFileDetails && (
                  <>
                    <Th
                      w="120px"
                      bg="gray.200"
                      color="gray.800"
                      onClick={() => handleSort("productColor")}
                      cursor="pointer"
                    >
                      Color Name{" "}
                      {sortConfig.key === "productColor" &&
                        (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th
                      w="120px"
                      bg="gray.200"
                      color="gray.800"
                      onClick={() => handleSort("productCategory")}
                      cursor="pointer"
                    >
                      Category{" "}
                      {sortConfig.key === "productCategory" &&
                        (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                  </>
                )}
                <Th
                  w="100px"
                  onClick={() => handleSort("totalImageCount")}
                  cursor="pointer"
                  color="gray.800"
                >
                  Total Image{" "}
                  {sortConfig.key === "totalImageCount" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th
                  w="100px"
                  onClick={() => handleSort("positiveSortCount")}
                  cursor="pointer"
                  color="gray.800"
                >
                  Positive Count{" "}
                  {sortConfig.key === "positiveSortCount" &&
                    (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedRecords.map((record) => {
                const imagedetails = getImagesForEntry(record.entryId, numImages);
                const totalImageCount = getTotalImageCountForEntry(record.entryId);
                const positiveSortCount = getPositiveSortCountForEntry(record.entryId);
                return (
                  <Tr
                    key={record.entryId}
                    _hover={{ bg: "gray.50" }}
                    opacity={positiveSortCount === 0 && !hideEmptyRows ? 0.8 : 1}
                  >
                    {showFileDetails && hasThumbnails && (
                      <Td w="80px" bg="gray.50">
                        {record.excelRowImageRef ? (
                          <Image
                            src={record.excelRowImageRef}
                            alt={`Pic of ${record.productModel || "Record"}`}
                            maxW="80px"
                            maxH="80px"
                            fallback={<Text fontSize="xs" color="gray.600">Failed</Text>}
                            objectFit="cover"
                            onError={() => showToast("Thumbnail Error", `Failed to load thumbnail for record ${record.entryId}`, "error")}
                          />
                        ) : (
                          <Text fontSize="xs" color="gray.600">No image</Text>
                        )}
                      </Td>
                    )}
                    {imagedetails.map((image, index) => (
                      <React.Fragment key={index}>
                        <Td w="100px">
                          <Image
                            src={image.imageUrlThumbnail}
                            alt={image.imageDesc || "No description"}
                            maxW="80px"
                            maxH="80px"
                            objectFit="cover"
                            fallback={<Text fontSize="xs" color="gray.600">No image</Text>}
                            onError={() => showToast("Image Error", `Failed to load image ${index + 1} for record ${record.entryId}`, "error")}
                          />
                        </Td>
                        {showResultDetails && (
                          <Td w="200px" bg="gray.50">
                            <Box wordBreak="break-all">
                              <Text fontSize="xs">
                                <a
                                  href={googleSearch(image.imageDesc)}
                                  onClick={(e) => handleLinkClick(e, googleSearch(image.imageDesc))}
                                  style={{ color: "#1a73e8" }}
                                >
                                  {image.imageDesc || "N/A"}
                                </a>
                              </Text>
                              <Text fontSize="xs" color="green.300">
                                <a
                                  href={image.imageSource}
                                  onClick={(e) => handleLinkClick(e, image.imageSource)}
                                >
                                  {shortenUrl(image.imageSource)}
                                </a>
                              </Text>
                              <Text fontSize="xs" color="green.300">
                                <a
                                  href={image.imageUrl}
                                  onClick={(e) => handleLinkClick(e, image.imageUrl)}
                                >
                                  {shortenUrl(image.imageUrl)}
                                </a>
                              </Text>
                              {image.aiCaption && (
                                <Text fontSize="xs" color="gray.600">
                                  AI Caption: {image.aiCaption}
                                </Text>
                              )}
                              {image.aiLabel && (
                                <Text fontSize="xs" color="gray.600">
                                  AI Label: {image.aiLabel}
                                </Text>
                              )}
                            </Box>
                          </Td>
                        )}
                      </React.Fragment>
                    ))}
                    {Array.from({ length: numImages - imagedetails.length }).map((_, index) => (
                      <React.Fragment key={`empty-${record.entryId}-${index}`}>
                        <Td w="100px">
                          <Text fontSize="xs" color="gray.600">No picture</Text>
                        </Td>
                        {showResultDetails && (
                          <Td w="200px" bg="gray.50">
                            <Text fontSize="xs" color="gray.600">No picture detail</Text>
                          </Td>
                        )}
                      </React.Fragment>
                    ))}
                    <Td w="90px">
                      <Text
                        cursor="pointer"
                        color="green.300"
                        _hover={{ textDecoration: "underline" }}
                        onClick={(e) => handleRowIdClick(e, record.productModel)}
                      >
                        {record.excelRowId}
                      </Text>
                    </Td>
                    <Td w="150px">
                      {record.productModel ? (
                        <a
                          href={googleSearch(record.productModel)}
                          onClick={(e) => handleLinkClick(e, googleSearch(record.productModel))}
                        >
                          <Text color="green.300">{record.productModel}</Text>
                        </a>
                      ) : (
                        <Text fontSize="xs" color="gray.600">No style</Text>
                      )}
                    </Td>
                    <Td w="150px">
                      {record.productBrand ? (
                        <a
                          href={googleSearchBrandModelUrl(record.productModel, record.productBrand)}
                          onClick={(e) =>
                            handleLinkClick(e, googleSearchBrandModelUrl(record.productModel, record.productBrand))
                          }
                        >
                          <Text color="green.300">{record.productBrand}</Text>
                        </a>
                      ) : (
                        <Text fontSize="xs" color="gray.600">No brand</Text>
                      )}
                    </Td>
                    {showFileDetails && (
                      <>
                        <Td w="120px" bg="gray.50">
                          {record.productColor || <Text fontSize="xs" color="gray.600">No color</Text>}
                        </Td>
                        <Td w="120px" bg="gray.50">
                          {record.productCategory || <Text fontSize="xs" color="gray.600">No category</Text>}
                        </Td>
                      </>
                    )}
                    <Td w="100px">
                      {totalImageCount === 0 ? (
                        <Text fontSize="xs" color="gray.600">0</Text>
                      ) : (
                        <Text color="gray.800">{totalImageCount}</Text>
                      )}
                    </Td>
                    <Td w="100px">
                      {positiveSortCount === 0 ? (
                        <Text fontSize="xs" color="gray.600">0</Text>
                      ) : (
                        <Text color="gray.800">{positiveSortCount}</Text>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Box>
  );
};

const JobsDetailPage = () => {
  const { jobId } = useParams({ from: "/_layout/scraping-api/scraping-jobs/$jobId" }) as { jobId: string };
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobDetails | null>(null);
  const showToast = useCustomToast();

  const searchParams = useSearch({ from: "/_layout/scraping-api/scraping-jobs/$jobId" }) as { search?: string; activeTab?: string };
  const initialTab = searchParams.activeTab ? parseInt(searchParams.activeTab, 10) : 4;
  const [activeTab, setActiveTab] = useState<number>(isNaN(initialTab) || initialTab < 0 || initialTab > 4 ? 4 : initialTab);
  const [sortBy, setSortBy] = useState<"match" | "linesheet" | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.search || "");

  const fetchJobData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = `https://backend-dev.iconluxury.group/api/scraping-jobs/${jobId}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch job data: ${response.status} - ${response.statusText}`);
      }
      const data: JobDetails = await response.json();
      setJobData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showToast("Fetch Error", errorMessage, "error");
      setError(errorMessage);
      setJobData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [jobId]);

  if (isLoading) {
    return (
      <Container maxW="full" py={6} bg="white">
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" color="green.300" />
        </Flex>
      </Container>
    );
  }

  if (error || !jobData) {
    return (
      <Container maxW="full" py={6} bg="white">
        <Text color="red.500">{error || "Job data not available"}</Text>
      </Container>
    );
  }

  const tabsConfig = [
    {
      title: "Overview",
      component: () => (
        <OverviewTab
          job={jobData}
          sortBy={sortBy}
          setSortBy={setSortBy}
          fetchJobData={fetchJobData}
          setSearchQuery={setSearchQuery}
          setActiveTab={setActiveTab}
        />
      ),
    },
    { title: "Usage", component: () => <UsageTab job={jobData} /> },
    {
      title: "Results",
      component: () => (
        <ResultsTab
          job={jobData}
          sortBy={sortBy}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      ),
    },
    { title: "Logs", component: () => <LogsTab job={jobData} /> },
    { title: "File Rows", component: () => <SearchRowsTab job={jobData} /> },
  ];

  return (
    <Container maxW="full" bg="white">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="gray.800">Job: {jobId}</Text>
          <Text fontSize="sm" color="gray.600">Details and results for scraping job {jobData.inputFile}.</Text>
        </Box>
      </Flex>
      <Tabs
        variant="enclosed"
        isLazy
        index={activeTab}
        onChange={(index) => setActiveTab(index)}
        colorScheme="blue"
      >
        <TabList borderBottom="2px solid" borderColor="green.200">
          {tabsConfig.map((tab) => (
            <Tab
              key={tab.title}
              _selected={{ bg: "white", color: "green.300", borderColor: "green.300" }}
              color="gray.600"
            >
              {tab.title}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {tabsConfig.map((tab) => (
            <TabPanel key={tab.title}>{tab.component()}</TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export const Route = createFileRoute("/_layout/scraping-api/scraping-jobs/$jobId")({
  component: JobsDetailPage,
});

export default JobsDetailPage;