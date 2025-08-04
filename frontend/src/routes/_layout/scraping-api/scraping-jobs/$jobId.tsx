import React, { useState, useEffect } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  Container,
  Box,
  Text,
  Flex,
  Tabs,
  Icon,
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
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Progress, // Progress component import is necessary
} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";
import useCustomToast from "../../../../hooks/useCustomToast";
import { FiFileText } from "react-icons/fi";

// Interfaces
interface JobDetails {
  id: number;
  inputFile: string;
  fileLocationUrl: string;
  fileLocationURLComplete?: string;
  imageStart: string;
  imageEnd?: string;
  fileStart: string;
  fileEnd?: string;
  userId?: number;
  userEmail?: string;
  logFileUrl: string | null;
  userHeaderIndex?: string;
  user: string;
  rec: number;
  img: number;
  apiUsed: string;
  resultFile: string;
  results: ResultItem[];
  records: RecordItem[];
}

// Interface for the progress data from the API
interface ProgressData {
  fileId: number;
  totalRecords: number;
  step1Completed: number;
  step1Progress: number;
  step2Completed: number;
  step2Progress: number;
  step3Completed: number;
  step3Progress: number;
  step4Completed: number;
  step4Progress: number;
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

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any> | null;
}

interface SearchRowsTabProps {
  job: JobDetails;
  searchQuery: string; // Added to support search functionality
}

// LogDisplay Component
const LogDisplay: React.FC<LogDisplayProps> = ({ logUrl }) => {
  const [logContent, setLogContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useCustomToast();

  useEffect(() => {
    const fetchLog = async () => {
      if (!logUrl) return;
      setIsLoading(true);
      try {
        const response = await fetch(logUrl);
        if (!response.ok) throw new Error("Failed to fetch log");
        const text = await response.text();
        setLogContent(text);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
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
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
        {logContent}
      </pre>
    </Box>
  );
};

// OverviewTab Component
interface OverviewTabProps {
  job: JobDetails;
  sortBy: "match" | "linesheet" | null;
  setSortBy: (value: "match" | "linesheet" | null) => void;
  fetchJobData: () => Promise<void>;
  setActiveTab: (index: number) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ job, fetchJobData, setActiveTab }) => {
  const navigate = useNavigate();
  const [isRestarting, setIsRestarting] = useState(false);
  const [isCreatingXLS, setIsCreatingXLS] = useState(false);
  const [isMatchAISort, setIsMatchAISort] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isInitialSort, setIsInitialSort] = useState(false);
  const [isSearchSort, setIsSearchSort] = useState(false);
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const showToast = useCustomToast();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  // Effect to poll for job progress if the job is not yet complete
  useEffect(() => {
    if (job.fileEnd || !job.id) {
      setProgressData(null); // Clear progress if job is done
      return;
    }

    let isCancelled = false;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`https://external.iconluxury.today/api/scraping-jobs/${job.id}/progress`);
        if (response.ok) {
          const data: ProgressData = await response.json();
          if (!isCancelled) {
            setProgressData(data);
          }
        } else {
          console.error("Failed to fetch job progress:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching job progress:", error);
      }
    };

    fetchProgress(); // Initial fetch
    const intervalId = setInterval(fetchProgress, 5000); // Poll every 5 seconds

    return () => {
      isCancelled = true;
      clearInterval(intervalId); // Cleanup on component unmount or dependency change
    };
  }, [job.id, job.fileEnd]);


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
      acc[domain] = { totalResults: 0, positiveSortOrderCount: 0, entryIds: new Set<number>() };
    }
    acc[domain].totalResults += 1;
    if (result.sortOrder > 0) {
      acc[domain].positiveSortOrderCount += 1;
      acc[domain].entryIds.add(result.entryId);
    }
    return acc;
  }, {} as Record<string, { totalResults: number; positiveSortOrderCount: number; entryIds: Set<number> }>);

  const topDomains = Object.entries(domainData)
    .map(([domain, data]) => ({
      domain,
      totalResults: data.totalResults,
      positiveSortOrderCount: data.positiveSortOrderCount,
      entryIds: Array.from(data.entryIds),
    }))
    .sort((a, b) => b.positiveSortOrderCount - a.positiveSortOrderCount)
    .slice(0, 20);

  const sortedTopDomains = [...topDomains].sort((a, b) => {
    if (sortConfig.key === "domain") {
      const aValue = a.domain.toLowerCase();
      const bValue = b.domain.toLowerCase();
      return sortConfig.direction === "ascending" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else if (sortConfig.key === "totalResults") {
      return sortConfig.direction === "ascending" ? a.totalResults - b.totalResults : b.totalResults - a.totalResults;
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
        return { key, direction: prev.direction === "ascending" ? "descending" : "ascending" };
      }
      return { key, direction: "ascending" };
    });
  };

  const handleDomainClick = (domain: string, entryId: number) => {
    navigate({
      to: "/_layout/scraping-api/scraping-jobs/$jobId",
      params: { jobId: String(job.id) },
      search: { activeTab: "2", domain, entryId: String(entryId) },
    });
    setActiveTab(2); // Switch to "Results" tab
  };

  const handleApiCall = async (
    url: string,
    method: "GET" | "POST",
    setLoading: (value: boolean) => void,
    successMessage: string,
    file_id?: string // Consider making this required if the API always needs it
) => {
    setLoading(true);
    try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (method === "POST") headers["Content-Type"] = "application/json";

        // Ensure file_id_db is included and valid (match API expectation)
        if (!file_id) {
            throw new Error("file_id is required but was not provided");
        }
        const urlWithParams = `${url}?file_id=${file_id}`; // Use file_id_db instead of file_id

        const response = await fetch(urlWithParams, {
            method,
            headers,
            body: method === "POST" ? JSON.stringify({ file_id: file_id }) : undefined, // Include body for POST
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();
        setLoading(false);
        showToast("Success", `${successMessage}: ${data.message || "Completed"}`, "success");
        fetchJobData();
    } catch (error) {
        setLoading(false);
        showToast(
            "Error",
            `Failed to ${successMessage.toLowerCase()}: ${error instanceof Error ? error.message : "Unknown error"}`,
            "error"
        );
    }
};
const handleInitialSort = () =>
    handleApiCall(`https://dev-image-distro.popovtech.com/initial_sort/`, "GET", setIsInitialSort, "Initial Sort",   job.id.toString());

const handleSearchSort = () =>
    handleApiCall(`https://dev-image-distro.popovtech.com/search_sort/`, "GET", setIsSearchSort, "Search Sort",   job.id.toString());

const handleRestartClick = () =>
    handleApiCall(
        `https://dev-image-distro.popovtech.com/restart-failed-batch/`,
        "POST",
        setIsRestarting,
        "Restart Failed Batch",
        job.id.toString()
    );
  const handleGenerateDownload = () =>
    handleApiCall(`https://dev-image-distro.popovtech.com/generate-download-file/`, "POST", setIsGeneratingDownload, "Generate Download File",   job.id.toString());

  const handleProcessAI = () =>
    handleApiCall(`https://dev-image-distro.popovtech.com/process-ai-analysis/`, "POST", setIsProcessingAI, "Process AI Analysis",   job.id.toString());

  const progressSteps = [
    { label: "Step 1: Data Fetching", completed: progressData?.step1Completed, progress: progressData?.step1Progress },
    //  { label: "Step 2: Image Validatio", completed: progressData?.step2Completed, progress: progressData?.step2Progress },
    //  { label: "Step 3: AI Processing", completed: progressData?.step3Completed, progress: progressData?.step3Progress },
    //  { label: "Step 4: Finalizing", completed: progressData?.step4Completed, progress: progressData?.step4Progress },
  ];
  
  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
    
        <Flex gap={3} justify="flex-end" flexWrap="wrap">
          <DetailsModal
            isOpen={isFileModalOpen}
            onClose={() => setIsFileModalOpen(false)}
            title={`File ${job.id}`}
            data={{
              ID: job.id,
              FileName: job.inputFile,
              FileLocationUrl: job.fileLocationUrl,
              FileLocationURLComplete: job.fileLocationURLComplete,
              ImageStartTime: job.imageStart,
              ImageCompleteTime: job.imageEnd,
              CreateFileStartTime: job.fileStart,
              CreateFileCompleteTime: job.fileEnd,
              UserID: job.userId,
              UserEmail: job.userEmail,
              LogFileURL: job.logFileUrl,
              UserHeaderIndex: job.userHeaderIndex,
            }}
          />
        </Flex>
      </Flex>

      {/* --- Progress Bar Section --- */}
      {progressData && !job.fileEnd && (
         <Card mb={6} variant="outline">
           <CardBody>
             <Flex direction="column" gap={4}>
               {progressSteps.map((step, index) => (
                 <Box key={index}>
                   <Flex justify="space-between" align="baseline">
                     <Text fontWeight="medium" color="gray.800">{step.label}</Text>
                     <Text fontSize="sm" color="gray.600">
                       {step.completed} / {progressData.totalRecords} records
                     </Text>
                   </Flex>
                   <Progress
                     value={step.progress}
                     size="md"
                     colorScheme="green"
                     hasStripe={Number(step.progress)< 100}
                     isAnimated={Number(step.progress) < 100}
                     mt={1}
                     borderRadius="md"
                   />
                 </Box>
               ))}
             </Flex>
           </CardBody>
         </Card>
      )}
      {/* --- End of Progress Bar Section --- */}

      <Box mb={6}>
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
            <Badge colorScheme={job.fileEnd ? "green" : "yellow"}>{job.fileEnd ? "Completed" : "In Progress"}</Badge>
          </StatNumber>
        </Stat>
        {job.fileEnd && (
          <Stat mt={4}>
            <StatLabel color="gray.600">Processing Duration</StatLabel>
            <StatNumber color="gray.800">
              {((new Date(job.fileEnd).getTime() - new Date(job.fileStart).getTime()) / 1000 / 60).toFixed(2)} minutes
            </StatNumber>
          </Stat>
        )}
        <Stat mt={4}>
          <StatLabel color="gray.600">Total Results</StatLabel>
          <StatNumber color="gray.800">{job.results.length}</StatNumber>
        </Stat>
      </Box>
                <Button size="sm" onClick={() => setIsFileModalOpen(true)}>
            File Metadata
          </Button>
      {job.results.length > 0 && (
        <Box mt={6}>
          <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">
            Top Domains by Positive Sort Orders (Top 20)
          </Text>
          <Table variant="simple" size="sm" colorScheme="blue">
            <Thead bg="gray.100">
              <Tr>
                <Th onClick={() => handleSort("domain")} cursor="pointer" color="gray.800">
                  Domain {sortConfig.key === "domain" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th onClick={() => handleSort("totalResults")} cursor="pointer" color="gray.800">
                  Total Results {sortConfig.key === "totalResults" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th onClick={() => handleSort("positiveSortOrderCount")} cursor="pointer" color="gray.800">
                  Positive Sort Orders Count {sortConfig.key === "positiveSortOrderCount" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedTopDomains.map(({ domain, totalResults, positiveSortOrderCount, entryIds }) => (
                <Tr key={domain}>
                  <Td>
                    <Text color="green.300" cursor="pointer" onClick={() => handleDomainClick(domain, entryIds[0] || 0)} _hover={{ textDecoration: "underline" }}>
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

// DetailsModal Component
const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, title, data }) => {
  const capitalizeKey = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();

  const renderValue = (key: string, value: any) => {
    if (value === null || value === undefined) return <Text color="gray.400">N/A</Text>;
    let displayValue = value;
    if (typeof value === "string" && (key.toLowerCase().includes("description") || key.toLowerCase().includes("aicaption"))) {
      displayValue = value.replace(/\\u0026/g, "&").replace(/\\'/g, "'");
    }
    if (key.toLowerCase().includes("json") && value) {
      const jsonValue = typeof value === "string" ? JSON.parse(value) : value;
      return (
        <Box maxH="500px" overflowY="auto" bg="gray.50" p={3} borderRadius="md" border="1px solid" borderColor="gray.200" fontSize="xs">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "blue.600" }}>{JSON.stringify(jsonValue, null, 2)}</pre>
        </Box>
      );
    }
    if (typeof displayValue === "string" && /^(https?:\/\/[^\s]+)$/.test(displayValue)) {
      return <Link href={displayValue} color="blue.500" isExternal>{displayValue}</Link>;
    }
    return <Text>{displayValue}</Text>;
  };

  if (!data) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent maxW="90vw" maxH="70vh" mx="auto" my={4}>
          <ModalHeader fontSize="xl" fontWeight="bold">{title}</ModalHeader>
          <ModalBody><Text fontSize="md" color="gray.600">No data available</Text></ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const modalTitle = data.id ? `${title} (ID: ${data.id})` : title;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalOverlay />
      <ModalContent maxW="90vw" maxH="80vh" mx="auto" my={4} borderRadius="md">
        <ModalHeader fontSize="xl" fontWeight="bold" pb={2}>{modalTitle}</ModalHeader>
        <ModalBody overflowY="auto">
          <Table variant="simple" size="md" colorScheme="gray">
            <Tbody>
              {Object.entries(data).filter(([key]) => key.toLowerCase() !== "id").map(([key, value]) => (
                <Tr key={key}>
                  <Td fontWeight="semibold" color="gray.700" w="25%" py={3}>{capitalizeKey(key)}</Td>
                  <Td wordBreak="break-word" color="gray.800" py={3}>{renderValue(key, value)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// ResultsTab Component with Domain and EntryId Filtering
interface ResultsTabProps {
  job: JobDetails;
  sortBy: "match" | "linesheet" | null;
  domain?: string;
  entryId?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ job, sortBy, domain, entryId, searchQuery }) => {
  const showToast = useCustomToast();
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const query = (searchQuery || "").trim().toLowerCase();
const filteredResults = job.results.filter((result) => {
  const matchesSearchQuery =
    (result.imageDesc || "").toLowerCase().includes(query) ||
    (result.imageSource || "").toLowerCase().includes(query) ||
    (result.aiJson || "").toLowerCase().includes(query) ||
    (result.imageUrl || "").toLowerCase().includes(query) ||
    (result.aiCaption || "").toLowerCase().includes(query) ||
    (result.aiLabel || "").toLowerCase().includes(query) ||
    (result.createTime || "").toLowerCase().includes(query) ||
    result.entryId.toString().includes(query) || // Ensures entryId is searchable
    result.resultId.toString().includes(query);

  const matchesDomain = domain
    ? new URL(result.imageSource).hostname.replace(/^www\./, "").includes(domain)
    : true;

  const matchesEntryId = entryId ? result.entryId.toString() === entryId : true;

  return matchesSearchQuery && matchesDomain && matchesEntryId;
});

  const [sortConfigResults, setSortConfigResults] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null);
  const [currentPageResults, setCurrentPageResults] = useState(0);
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">("infinite");
  const [displayCount, setDisplayCount] = useState(50);
  const itemsPerPage = 5;

  const handleSortResults = (key: string) => {
    setSortConfigResults((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === "ascending" ? "descending" : "ascending" };
      }
      return { key, direction: "ascending" };
    });
    setCurrentPageResults(0);
  };


  const sortedResults = [...filteredResults].sort((a, b) => {
    if (a.sortOrder >= 0 && b.sortOrder < 0) return -1;
    if (a.sortOrder < 0 && b.sortOrder >= 0) return 1;
    if (sortConfigResults) {
      const { key, direction } = sortConfigResults;
      const aValue = a[key as keyof ResultItem];
      const bValue = b[key as keyof ResultItem];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "ascending" ? aValue - bValue : bValue - aValue;
      } else {
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        return direction === "ascending" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      }
    } else if (sortBy === "match" && query) {
      const aScore = (a.imageDesc || "").toLowerCase().indexOf(query);
      const bScore = (b.imageDesc || "").toLowerCase().indexOf(query);
      return aScore === -1 ? 1 : bScore === -1 ? -1 : aScore - bScore;
    } else if (sortBy === "linesheet") {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
    return 0;
  });

  const pageCountResults = Math.ceil(sortedResults.length / itemsPerPage);
  const displayedResultsPagination = sortedResults.slice(currentPageResults * itemsPerPage, (currentPageResults + 1) * itemsPerPage);
  const displayedResultsInfinite = sortedResults.slice(0, displayCount);

  const totalResults = sortedResults.length;

  const shortenUrl = (url: string) => {
    if (!url) return "";
    return url;
  };

  return (
    <Box p={4} bg="white">
    <Flex justify="space-between" align="center" mb={4} gap={2}>
      <Text fontSize="lg" fontWeight="bold" color="gray.800">Results ({totalResults})</Text>
      <Flex gap={2}>
      <Button
  size="sm"
  bg={viewMode === "pagination" ? "green.500" : "white"}
  borderWidth={viewMode === "infinite" ? "1px" : "0"}
  borderColor="gray.200"
  transition="all 0.2s" // Smooth transition for bg and border
  onClick={() => setViewMode(viewMode === "pagination" ? "infinite" : "pagination")}
  p={2}
>
  <Icon
    as={FiFileText}
    color={viewMode === "pagination" ? "white" : "green.500"}
    transition="color 0.2s" // Smooth transition for icon color
  />
</Button>
      </Flex>
    </Flex>
    <Card shadow="md" borderWidth="1px" bg="white">
      <CardBody>
          {viewMode === "pagination" ? (
            <>
              <Table variant="simple" size="sm" colorScheme="blue">
                <Thead bg="gray.100">
                  <Tr>
                    <Th w="60px" color="gray.800">Preview</Th>
                    <Th w="80px" onClick={() => handleSortResults("resultId")} cursor="pointer" color="gray.800">
                      Result ID {sortConfigResults?.key === "resultId" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" onClick={() => handleSortResults("entryId")} cursor="pointer" color="gray.800">
                      Entry ID {sortConfigResults?.key === "entryId" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortResults("imageUrl")} cursor="pointer" color="gray.800">
                      Image URL {sortConfigResults?.key === "imageUrl" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortResults("imageDesc")} cursor="pointer" color="gray.800">
                      Description {sortConfigResults?.key === "imageDesc" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortResults("imageSource")} cursor="pointer" color="gray.800">
                      Source {sortConfigResults?.key === "imageSource" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" onClick={() => handleSortResults("sortOrder")} cursor="pointer" color="gray.800">
                      Sort Order {sortConfigResults?.key === "sortOrder" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" color="gray.800">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {displayedResultsPagination.map((result) => (
                    <Tr key={result.resultId}>
                      <Td w="60px">
                        <Image src={result.imageUrlThumbnail || ""} alt={result.imageDesc || "No description"} maxW="80px" maxH="80px" objectFit="cover" fallback={<Text fontSize="xs" color="gray.600">No image</Text>} />
                      </Td>
                      <Td w="80px" color="gray.800">{result.resultId || "N/A"}</Td>
                      <Td w="80px" color="gray.800">{result.entryId || "N/A"}</Td>
                      <Td w="120px" wordBreak="break-all">
                        <a href={result.imageUrl || "#"} target="_blank" rel="noopener noreferrer">
                          <Text color="green.300">{shortenUrl(result.imageUrl)}</Text>
                        </a>
                      </Td>
                      <Td w="120px" color="gray.800">{result.imageDesc || "N/A"}</Td>
                      <Td w="120px" wordBreak="break-all">
                        <a href={result.imageSource || "#"} target="_blank" rel="noopener noreferrer">
                          <Text color="green.300">{shortenUrl(result.imageSource)}</Text>
                        </a>
                      </Td>
                      <Td w="80px" color="gray.800">{result.sortOrder || "0"}</Td>
                      <Td w="80px">
                        <Button size="xs" onClick={() => { setSelectedResult(result); setIsResultModalOpen(true); }}>
                          View Details
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                  {displayedResultsPagination.length === 0 && (
                    <Tr>
                      <Td colSpan={8} textAlign="center" color="gray.600">No results match your search query on this page.</Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
              {pageCountResults > 1 && (
                <Flex justify="center" mt={4} align="center" gap={2}>
                  <Button size="sm" onClick={() => setCurrentPageResults(0)} isDisabled={currentPageResults === 0}>First</Button>
                  <Button size="sm" onClick={() => setCurrentPageResults((prev) => Math.max(prev - 1, 0))} isDisabled={currentPageResults === 0}>Previous</Button>
                  <Text mx={2}>Page {currentPageResults + 1} of {pageCountResults}</Text>
                  <Button size="sm" onClick={() => setCurrentPageResults((prev) => Math.min(prev + 1, pageCountResults - 1))} isDisabled={currentPageResults === pageCountResults - 1}>Next</Button>
                  <Button size="sm" onClick={() => setCurrentPageResults(pageCountResults - 1)} isDisabled={currentPageResults === pageCountResults - 1}>Last</Button>
                </Flex>
              )}
            </>
          ) : (
            <InfiniteScroll
              dataLength={displayCount}
              next={() => setDisplayCount((prev) => prev + 50)}
              hasMore={displayCount < sortedResults.length}
              loader={<Text>Loading more results...</Text>}
              endMessage={<Text>No more results to load.</Text>}
            >
              <Table variant="simple" size="sm" colorScheme="blue">
                <Thead bg="gray.100">
                  <Tr>
                    <Th w="60px" color="gray.800">Preview</Th>
                    <Th w="80px" onClick={() => handleSortResults("resultId")} cursor="pointer" color="gray.800">
                      Result ID {sortConfigResults?.key === "resultId" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" onClick={() => handleSortResults("entryId")} cursor="pointer" color="gray.800">
                      Entry ID {sortConfigResults?.key === "entryId" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortResults("imageUrl")} cursor="pointer" color="gray.800">
                      Image URL {sortConfigResults?.key === "imageUrl" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortResults("imageDesc")} cursor="pointer" color="gray.800">
                      Description {sortConfigResults?.key === "imageDesc" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortResults("imageSource")} cursor="pointer" color="gray.800">
                      Source {sortConfigResults?.key === "imageSource" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" onClick={() => handleSortResults("sortOrder")} cursor="pointer" color="gray.800">
                      Sort Order {sortConfigResults?.key === "sortOrder" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" color="gray.800">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {displayedResultsInfinite.map((result) => (
                    <Tr key={result.resultId}>
                      <Td w="60px">
                        <Image src={result.imageUrlThumbnail || ""} alt={result.imageDesc || "No description"} maxW="80px" maxH="80px" objectFit="cover" fallback={<Text fontSize="xs" color="gray.600">No image</Text>} />
                      </Td>
                      <Td w="80px" color="gray.800">{result.resultId || "N/A"}</Td>
                      <Td w="80px" color="gray.800">{result.entryId || "N/A"}</Td>
                      <Td w="120px" wordBreak="break-all">
                        <a href={result.imageUrl || "#"} target="_blank" rel="noopener noreferrer">
                          <Text color="green.300">{shortenUrl(result.imageUrl)}</Text>
                        </a>
                      </Td>
                      <Td w="120px" color="gray.800">{result.imageDesc || "N/A"}</Td>
                      <Td w="120px" wordBreak="break-all">
                        <a href={result.imageSource || "#"} target="_blank" rel="noopener noreferrer">
                          <Text color="green.300">{shortenUrl(result.imageSource)}</Text>
                        </a>
                      </Td>
                      <Td w="80px" color="gray.800">{result.sortOrder || "0"}</Td>
                      <Td w="80px">
                        <Button size="xs" onClick={() => { setSelectedResult(result); setIsResultModalOpen(true); }}>
                          View Details
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </InfiniteScroll>
          )}
        </CardBody>
      </Card>
      <DetailsModal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} title={`Result ${selectedResult?.resultId || "Details"}`} data={selectedResult} />
    </Box>
  );
};

// RecordsTab Component
interface RecordsTabProps {
  job: JobDetails;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const RecordsTab: React.FC<RecordsTabProps> = ({ job, searchQuery }) => {
  const showToast = useCustomToast();
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const [sortConfigRecords, setSortConfigRecords] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null);
  const [currentPageRecords, setCurrentPageRecords] = useState(0);
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">("infinite");
  const [displayCount, setDisplayCount] = useState(50);
  const itemsPerPage = 5;

  const handleSortRecords = (key: string) => {
    setSortConfigRecords((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === "ascending" ? "descending" : "ascending" };
      }
      return { key, direction: "ascending" };
    });
    setCurrentPageRecords(0);
  };

  const query = (searchQuery || "").trim().toLowerCase();
  const filteredRecords = job.records.filter((record) =>
  (record.productModel || "").toLowerCase().includes(query) ||
  (record.productBrand || "").toLowerCase().includes(query) ||
  (record.productColor || "").toLowerCase().includes(query) ||
  (record.productCategory || "").toLowerCase().includes(query) ||
  record.entryId.toString().includes(query) || // Ensures entryId is searchable
  record.excelRowId.toString().includes(query)
);
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortConfigRecords) {
      const { key, direction } = sortConfigRecords;
      const aValue = a[key as keyof RecordItem];
      const bValue = b[key as keyof RecordItem];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "ascending" ? aValue - bValue : bValue - aValue;
      } else {
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        return direction === "ascending" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      }
    }
    return 0;
  });

  const pageCountRecords = Math.ceil(sortedRecords.length / itemsPerPage);
  const displayedRecordsPagination = sortedRecords.slice(currentPageRecords * itemsPerPage, (currentPageRecords + 1) * itemsPerPage);
  const displayedRecordsInfinite = sortedRecords.slice(0, displayCount);

  const totalRecords = sortedRecords.length;
  const hasThumbnails = filteredRecords.some((record) => record.excelRowImageRef);

  return (
    <Box p={4} bg="white">
    <Flex justify="space-between" align="center" mb={4} gap={2}>
      <Text fontSize="lg" fontWeight="bold" color="gray.800">Records ({totalRecords})</Text>
      <Flex gap={2}>
      <Button
  size="sm"
  bg={viewMode === "pagination" ? "green.500" : "white"}
  borderWidth={viewMode === "infinite" ? "1px" : "0"}
  borderColor="gray.200"
  transition="all 0.2s" // Smooth transition for bg and border
  onClick={() => setViewMode(viewMode === "pagination" ? "infinite" : "pagination")}
  p={2}
>
  <Icon
    as={FiFileText}
    color={viewMode === "pagination" ? "white" : "green.500"}
    transition="color 0.2s" // Smooth transition for icon color
  />
</Button>
      </Flex>
    </Flex>
      <Card shadow="md" borderWidth="1px" bg="white">
        <CardBody>
          {viewMode === "pagination" ? (
            <>
              <Table variant="simple" size="sm" colorScheme="blue">
                <Thead bg="gray.100">
                  <Tr>
                    {hasThumbnails && <Th w="60px" color="gray.800">Excel Picture</Th>}
                    <Th w="80px" onClick={() => handleSortRecords("entryId")} cursor="pointer" color="gray.800">
                      Entry ID {sortConfigRecords?.key === "entryId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" onClick={() => handleSortRecords("fileId")} cursor="pointer" color="gray.800">
                      File ID {sortConfigRecords?.key === "fileId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" onClick={() => handleSortRecords("excelRowId")} cursor="pointer" color="gray.800">
                      Excel Row ID {sortConfigRecords?.key === "excelRowId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortRecords("productModel")} cursor="pointer" color="gray.800">
                      Style # {sortConfigRecords?.key === "productModel" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortRecords("productBrand")} cursor="pointer" color="gray.800">
                      Brand {sortConfigRecords?.key === "productBrand" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" color="gray.800">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {displayedRecordsPagination.map((record) => (
                    <Tr key={record.entryId}>
                      {hasThumbnails && (
                        <Td w="60px">
                          {record.excelRowImageRef ? (
                            <Image
                              src={record.excelRowImageRef}
                              alt={record.productModel || "Record ID " + record.entryId}
                              maxW="80px"
                              maxH="80px"
                              objectFit="cover"
                              cursor="pointer"
                              onClick={() => {
                                if (record.excelRowImageRef) window.open(record.excelRowImageRef, "_blank");
                              }}
                              onError={(e) => {
                                showToast("Image Load Failed", `Failed to load S3 image: ${record.excelRowImageRef}`, "warning");
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
                      <Td w="80px">
                        <Button size="xs" onClick={() => { setSelectedRecord(record); setIsRecordModalOpen(true); }}>
                          View Details
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                  {displayedRecordsPagination.length === 0 && (
                    <Tr>
                      <Td colSpan={hasThumbnails ? 7 : 6} textAlign="center" color="gray.600">No records match your search query on this page.</Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
              {pageCountRecords > 1 && (
                <Flex justify="center" mt={4} align="center" gap={2}>
                  <Button size="sm" onClick={() => setCurrentPageRecords(0)} isDisabled={currentPageRecords === 0}>First</Button>
                  <Button size="sm" onClick={() => setCurrentPageRecords((prev) => Math.max(prev - 1, 0))} isDisabled={currentPageRecords === 0}>Previous</Button>
                  <Text mx={2}>Page {currentPageRecords + 1} of {pageCountRecords}</Text>
                  <Button size="sm" onClick={() => setCurrentPageRecords((prev) => Math.min(prev + 1, pageCountRecords - 1))} isDisabled={currentPageRecords === pageCountRecords - 1}>Next</Button>
                  <Button size="sm" onClick={() => setCurrentPageRecords(pageCountRecords - 1)} isDisabled={currentPageRecords === pageCountRecords - 1}>Last</Button>
                </Flex>
              )}
            </>
          ) : (
            <InfiniteScroll
              dataLength={displayCount}
              next={() => setDisplayCount((prev) => prev + 50)}
              hasMore={displayCount < sortedRecords.length}
              loader={<Text>Loading more records...</Text>}
              endMessage={<Text>No more records to load.</Text>}
            >
              <Table variant="simple" size="sm" colorScheme="blue">
                <Thead bg="gray.100">
                  <Tr>
                    {hasThumbnails && <Th w="60px" color="gray.800">Excel Picture</Th>}
                    <Th w="80px" onClick={() => handleSortRecords("entryId")} cursor="pointer" color="gray.800">
                      Entry ID {sortConfigRecords?.key === "entryId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" onClick={() => handleSortRecords("fileId")} cursor="pointer" color="gray.800">
                      File ID {sortConfigRecords?.key === "fileId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" onClick={() => handleSortRecords("excelRowId")} cursor="pointer" color="gray.800">
                      Excel Row ID {sortConfigRecords?.key === "excelRowId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortRecords("productModel")} cursor="pointer" color="gray.800">
                      Style # {sortConfigRecords?.key === "productModel" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="120px" onClick={() => handleSortRecords("productBrand")} cursor="pointer" color="gray.800">
                      Brand {sortConfigRecords?.key === "productBrand" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="80px" color="gray.800">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {displayedRecordsInfinite.map((record) => (
                    <Tr key={record.entryId}>
                      {hasThumbnails && (
                        <Td w="60px">
                          {record.excelRowImageRef ? (
                            <Image
                              src={record.excelRowImageRef}
                              alt={record.productModel || "Record ID " + record.entryId}
                              maxW="80px"
                              maxH="80px"
                              objectFit="cover"
                              cursor="pointer"
                              onClick={() => {
                                if (record.excelRowImageRef) window.open(record.excelRowImageRef, "_blank");
                              }}
                              onError={(e) => {
                                showToast("Image Load Failed", `Failed to load S3 image: ${record.excelRowImageRef}`, "warning");
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
                      <Td w="80px">
                        <Button size="xs" onClick={() => { setSelectedRecord(record); setIsRecordModalOpen(true); }}>
                          View Details
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </InfiniteScroll>
          )}
        </CardBody>
      </Card>
      <DetailsModal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title={`Record ${selectedRecord?.entryId || "Details"}`} data={selectedRecord} />
    </Box>
  );
};

// LogsTab Component
const LogsTab = ({ job }: { job: JobDetails }) => {
  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4}>
        {job.logFileUrl && (
          <Button size="sm" colorScheme="blue" onClick={() => window.open(job.logFileUrl as string, "_blank")}>
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

// SearchRowsTab Component with Search, Pagination, and Infinite Scroll
const SearchRowsTab: React.FC<SearchRowsTabProps> = ({ job, searchQuery }) => {
  const showToast = useCustomToast();
  const [showFileDetails, setShowFileDetails] = useState(true);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: "ascending" | "descending" }>({ key: null, direction: "ascending" });
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">("infinite");
  const [currentPage, setCurrentPage] = useState(0);
  const [displayCount, setDisplayCount] = useState(50);
  const itemsPerPage = 5;

  const query = (searchQuery || "").trim().toLowerCase();
  console.log("Search Query:", searchQuery, "Processed Query:", query); // Debugging

  const filteredRecords = job.records.filter((record) =>
    (record.productModel || "").toLowerCase().includes(query) ||
    (record.productBrand || "").toLowerCase().includes(query) ||
    (record.productColor || "").toLowerCase().includes(query) ||
    (record.productCategory || "").toLowerCase().includes(query) ||
    record.entryId.toString().includes(query) ||
    record.excelRowId.toString().includes(query)
  );
  console.log("Filtered Records:", filteredRecords); // Debugging

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
    return url;
  };

  const googleSearch = (model: string): string => `https://www.google.com/search?q=${encodeURIComponent(model || "")}&udm=2`;
  const googleSearchBrandModelUrl = (model: string, brand: string): string => `https://www.google.com/search?q=${encodeURIComponent(`${brand || ""} ${model || ""}`)}&udm=2`;

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

  const handleRowIdClick = (e: React.MouseEvent<HTMLElement, MouseEvent>, entryId: number) => {
    e.preventDefault();
    const url = `${window.location.pathname}?activeTab=1&search=${encodeURIComponent(entryId.toString() || "")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      const newDirection = prev.key === key && prev.direction === "ascending" ? "descending" : "ascending";
      return { key, direction: newDirection };
    });
    setCurrentPage(0);
  };

  const displayedRecords = hideEmptyRows
    ? filteredRecords.filter((record) => getPositiveSortCountForEntry(record.entryId) > 0)
    : filteredRecords;

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

  const pageCount = Math.ceil(sortedRecords.length / itemsPerPage);
  const displayedRecordsPagination = sortedRecords.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const displayedRecordsInfinite = sortedRecords.slice(0, displayCount);

  const hasThumbnails = sortedRecords.some((record) => record.excelRowImageRef);

  const renderTable = (records: RecordItem[]) => (
    <Table
      variant="simple"
      size="sm"
      borderWidth="1px"
      borderColor="gray.200"
      colorScheme="blue"
      sx={{ "td, th": { border: "1px solid", borderColor: "gray.200", p: 2, verticalAlign: "middle" } }}
    >
      <Thead bg="gray.100">
        <Tr>
          <Th
            w="90px"
            onClick={() => handleSort("excelRowId")}
            cursor="pointer"
            color="gray.800"
          >
            Row #{" "}
            {sortConfig.key === "excelRowId" &&
              (sortConfig.direction === "ascending" ? "↑" : "↓")}
          </Th>
         
          {showFileDetails && (
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
          )}
           {showFileDetails && (
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
          )}
          {showFileDetails && hasThumbnails && (
            <Th w="100px" bg="gray.200" color="gray.800">
              Excel Picture
            </Th>
          )}
          {Array.from({ length: numImages }).map((_, index) => (
            <React.Fragment key={`header-${index}`}>
              <Th w="100px" color="gray.800">
                Picture {index + 1}
              </Th>
              {showResultDetails && (
                <Th w="200px" bg="gray.200" color="gray.800">
                  Picture Detail {index + 1}
                </Th>
              )}
            </React.Fragment>
          ))}
          <Th
            w="150px"
            onClick={() => handleSort("productModel")}
            cursor="pointer"
            color="gray.800"
          >
            Style #{" "}
            {sortConfig.key === "productModel" &&
              (sortConfig.direction === "ascending" ? "↑" : "↓")}
          </Th>
          <Th
            w="150px"
            onClick={() => handleSort("productBrand")}
            cursor="pointer"
            color="gray.800"
          >
            Brand{" "}
            {sortConfig.key === "productBrand" &&
              (sortConfig.direction === "ascending" ? "↑" : "↓")}
          </Th>
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
        {records.map((record) => {
          const imagedetails = getImagesForEntry(record.entryId, numImages);
          const totalImageCount = getTotalImageCountForEntry(record.entryId);
          const positiveSortCount = getPositiveSortCountForEntry(record.entryId);
          return (
            <Tr
              key={record.entryId}
              _hover={{ bg: "gray.50" }}
              opacity={positiveSortCount === 0 && !hideEmptyRows ? 0.8 : 1}
            >
              <Td w="90px">
                <Text
                  cursor="pointer"
                  color="green.300"
                  _hover={{ textDecoration: "underline" }}
                  onClick={(e) => handleRowIdClick(e, record.entryId)}
                >
                  {record.excelRowId}
                </Text>
              </Td>
              {showFileDetails && (
                <Td w="120px" bg="gray.50">
                  {record.productCategory || (
                    <Text fontSize="xs" color="gray.600">
                      No category
                    </Text>
                  )}
                </Td>
              )}
              {showFileDetails && (
                <Td w="120px" bg="gray.50">
                  {record.productColor || (
                    <Text fontSize="xs" color="gray.600">
                      No color
                    </Text>
                  )}
                </Td>
              )}
              {showFileDetails && hasThumbnails && (
                <Td w="80px" bg="gray.50">
                  {record.excelRowImageRef ? (
                    <Image
                      src={record.excelRowImageRef}
                      alt={`Pic of ${record.productModel || "Record"}`}
                      maxW="80px"
                      maxH="80px"
                      fallback={
                        <Text fontSize="xs" color="gray.600">
                          Failed
                        </Text>
                      }
                      objectFit="cover"
                      onError={() =>
                        showToast(
                          "Thumbnail Error",
                          `Failed to load thumbnail for record ${record.entryId}`,
                          "error"
                        )
                      }
                    />
                  ) : (
                    <Text fontSize="xs" color="gray.600">
                      No image
                    </Text>
                  )}
                </Td>
              )}
              {imagedetails.map((image, index) => (
                <React.Fragment key={index}>
                  <Td w="80px">
                    <Image
                      src={image.imageUrlThumbnail}
                      alt={image.imageDesc || "No description"}
                      maxW="80px"
                      maxH="80px"
                      objectFit="cover"
                      fallback={
                        <Text fontSize="xs" color="gray.600">
                          No image
                        </Text>
                      }
                      onError={() =>
                        showToast(
                          "Image Error",
                          `Failed to load image ${index + 1} for record ${record.entryId}`,
                          "error"
                        )
                      }
                    />
                  </Td>
                  {showResultDetails && (
                    <Td w="200px" bg="gray.50">
                      <Box wordBreak="break-all">
                        <Text fontSize="xs">
                          <a
                            href={googleSearch(image.imageDesc)}
                            onClick={(e) =>
                              handleLinkClick(e, googleSearch(image.imageDesc))
                            }
                            style={{ color: "#1a73e8" }}
                          >
                            {image.imageDesc || "N/A"}
                          </a>
                        </Text>
                        <Text fontSize="xs" color="green.300">
                          <a
                            href={image.imageSource}
                            onClick={(e) =>
                              handleLinkClick(e, image.imageSource)
                            }
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
              {Array.from({ length: numImages - imagedetails.length }).map(
                (_, index) => (
                  <React.Fragment
                    key={`empty-${record.entryId}-${index}`}
                  >
                    <Td w="80px">
                      <Text fontSize="xs" color="gray.600">
                        No picture
                      </Text>
                    </Td>
                    {showResultDetails && (
                      <Td w="200px" bg="gray.50">
                        <Text fontSize="xs" color="gray.600">
                          No picture detail
                        </Text>
                      </Td>
                    )}
                  </React.Fragment>
                )
              )}
              <Td w="150px">
                {record.productModel ? (
                  <a
                    href={googleSearch(record.productModel)}
                    onClick={(e) =>
                      handleLinkClick(e, googleSearch(record.productModel))
                    }
                  >
                    <Text color="green.300">{record.productModel}</Text>
                  </a>
                ) : (
                  <Text fontSize="xs" color="gray.600">
                    No style
                  </Text>
                )}
              </Td>
              <Td w="150px">
                {record.productBrand ? (
                  <a
                    href={googleSearchBrandModelUrl(
                      record.productModel,
                      record.productBrand
                    )}
                    onClick={(e) =>
                      handleLinkClick(
                        e,
                        googleSearchBrandModelUrl(
                          record.productModel,
                          record.productBrand
                        )
                      )
                    }
                  >
                    <Text color="green.300">{record.productBrand}</Text>
                  </a>
                ) : (
                  <Text fontSize="xs" color="gray.600">
                    No brand
                  </Text>
                )}
              </Td>
              <Td w="100px">
                {totalImageCount === 0 ? (
                  <Text fontSize="xs" color="gray.600">
                    0
                  </Text>
                ) : (
                  <Text color="gray.800">{totalImageCount}</Text>
                )}
              </Td>
              <Td w="100px">
                {positiveSortCount === 0 ? (
                  <Text fontSize="xs" color="gray.600">
                    0
                  </Text>
                ) : (
                  <Text color="gray.800">{positiveSortCount}</Text>
                )}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );

  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4} position="sticky" top="0" bg="white" zIndex="10" py={5} borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="lg" fontWeight="bold" color="gray.800">File Rows ({sortedRecords.length})</Text>
        <Flex gap={3} justify="flex-end">
          <Button size="sm" colorScheme="blue" onClick={() => setShowResultDetails(!showResultDetails)}>
            {showResultDetails ? "- Picture Details" : "+ Picture Details"}
          </Button>
          <Button size="sm" colorScheme="blue" onClick={() => setShowFileDetails(!showFileDetails)}>
            {showFileDetails ? "- File Details" : "+ File Details"}
          </Button>
          <Button
            size="sm"
            onClick={() => job.records.length > 0 && setHideEmptyRows(!hideEmptyRows)}
            colorScheme={job.records.length === 0 ? "gray" : "blue"}
            variant={job.records.length === 0 ? "outline" : "solid"}
          >
            {hideEmptyRows ? "Show All Rows" : "Hide Empty Rows"}
          </Button>
          <Flex align="center" gap={2}>
            <Button size="sm" onClick={handleDecreaseImages} isDisabled={numImages <= 1} colorScheme="blue">-</Button>
            <Text color="gray.800">{numImages}</Text>
            <Button size="sm" onClick={handleIncreaseImages} isDisabled={numImages >= (showResultDetails ? 1 : 5)} colorScheme="blue">+</Button>
          </Flex>
      <Button
  size="sm"
  bg={viewMode === "pagination" ? "green.500" : "white"}
  borderWidth={viewMode === "infinite" ? "1px" : "0"}
  borderColor="gray.200"
  transition="all 0.2s" // Smooth transition for bg and border
  onClick={() => setViewMode(viewMode === "pagination" ? "infinite" : "pagination")}
  p={2}
>
  <Icon
    as={FiFileText}
    color={viewMode === "pagination" ? "white" : "green.500"}
    transition="color 0.2s" // Smooth transition for icon color
  />
</Button>
        </Flex>
      </Flex>

      <Card shadow="md" borderWidth="1px" bg="white">
        <CardBody p={0}>
          {viewMode === "pagination" ? (
            <>
              {renderTable(displayedRecordsPagination)}
              {pageCount > 1 && (
                <Flex justify="center" mt={4} align="center" gap={2}>
                  <Button size="sm" onClick={() => setCurrentPage(0)} isDisabled={currentPage === 0}>First</Button>
                  <Button size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))} isDisabled={currentPage === 0}>Previous</Button>
                  <Text mx={2}>Page {currentPage + 1} of {pageCount}</Text>
                  <Button size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount - 1))} isDisabled={currentPage === pageCount - 1}>Next</Button>
                  <Button size="sm" onClick={() => setCurrentPage(pageCount - 1)} isDisabled={currentPage === pageCount - 1}>Last</Button>
                </Flex>
              )}
            </>
          ) : (
            <InfiniteScroll
              dataLength={displayCount}
              next={() => setDisplayCount((prev) => prev + 50)}
              hasMore={displayCount < sortedRecords.length}
              loader={<Text>Loading more rows...</Text>}
              endMessage={<Text>No more rows to load.</Text>}
            >
              {renderTable(displayedRecordsInfinite)}
            </InfiniteScroll>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};
// JobsDetailPage Component
const JobsDetailPage = () => {
  const { jobId } = useParams({ from: "/_layout/scraping-api/scraping-jobs/$jobId" }) as { jobId: string };
  const searchParams = useSearch({ from: "/_layout/scraping-api/scraping-jobs/$jobId" }) as { search?: string; activeTab?: string; domain?: string; entryId?: string };
  const initialTab = searchParams.activeTab ? parseInt(searchParams.activeTab, 10) : 0;
  const initialSearch = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search || "";
  const [activeTab, setActiveTab] = useState<number>(isNaN(initialTab) || initialTab < 0 || initialTab > 5 ? 4 : initialTab);
  const [sortBy, setSortBy] = useState<"match" | "linesheet" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(String(initialSearch));
  const showToast = useCustomToast();

  const fetchJobData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = `https://external.iconluxury.today/api/scraping-jobs/${jobId}`;
      const response = await fetch(apiUrl, { method: "GET", headers: { "Content-Type": "application/json" } });
      if (!response.ok) throw new Error(`Failed to fetch job data: ${response.status} - ${response.statusText}`);
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
        <Flex justify="center" align="center" h="200px"><Spinner size="xl" color="green.300" /></Flex>
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
    { title: "Overview", component: () => <OverviewTab job={jobData} sortBy={sortBy} setSortBy={setSortBy} fetchJobData={fetchJobData} setActiveTab={setActiveTab} /> },
    { title: "Results", component: () => <ResultsTab job={jobData} sortBy={sortBy} domain={searchParams.domain} entryId={searchParams.entryId} searchQuery={searchQuery} setSearchQuery={setSearchQuery} /> },
    { title: "Records", component: () => <RecordsTab job={jobData} searchQuery={searchQuery} setSearchQuery={setSearchQuery} /> },
    { title: "Logs", component: () => <LogsTab job={jobData} /> },
    { title: "File Rows", component: () => <SearchRowsTab job={jobData} searchQuery={searchQuery} /> }, // Pass searchQuery
  ];

  return (
    <Container maxW="full" bg="white">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="gray.800">Job: {jobId}</Text>
          <Text fontSize="sm" color="gray.600">Details and results for scraping job {jobData.inputFile}.</Text>
        </Box>
      </Flex>
      <Tabs variant="enclosed" isLazy index={activeTab} onChange={(index) => setActiveTab(index)} colorScheme="blue">
        <TabList borderBottom="2px solid" borderColor="green.200">
          {tabsConfig.map((tab) => (
            <Tab key={tab.title} _selected={{ bg: "white", color: "green.300", borderColor: "green.300" }} color="gray.600">{tab.title}</Tab>
          ))}
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            width="300px"
            borderColor="green.300"
            _focus={{ borderColor: "green.300" }}
            color="gray.800"
            bg="white"
            ml="auto"
          />
        </TabList>
        <TabPanels>{tabsConfig.map((tab) => <TabPanel key={tab.title}>{tab.component()}</TabPanel>)}</TabPanels>
      </Tabs>
    </Container>
  );
};

export const Route = createFileRoute("/_layout/scraping-api/scraping-jobs/$jobId")({ component: JobsDetailPage });

export default JobsDetailPage;