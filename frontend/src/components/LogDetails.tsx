// src/components/LogDetails.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Text,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Button,
  Select,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import useCustomToast from "./../hooks/useCustomToast";
import debounce from "lodash/debounce";

interface LogEntry {
  timestamp: string;
  endpoint: string;
  query: string;
  status: "success" | "error";
  responseTime: number;
}

interface LogFile {
  fileId: string;
  fileName: string;
  url: string | null;
  lastModified: string;
  entries: LogEntry[] | null;
}

const logFileUrls = [
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_3.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_4.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_5.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_21.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_47.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_57.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_63.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_70.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_72.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_73.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_75.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_76.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_77.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_78.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_79.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_80.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_82.log",
];

const parseLogContent = (content: string): LogEntry[] => {
  const lines = content.split("\n").filter((line) => line.trim());
  return lines.map((line) => {
    const parts = line.split(" ");
    return {
      timestamp: parts[0] || new Date().toISOString(),
      endpoint: parts[1] || "Unknown",
      query: parts.slice(2, -2).join(" ") || "N/A",
      status: (parts[parts.length - 2] === "SUCCESS" ? "success" : "error") as "success" | "error",
      responseTime: parseInt(parts[parts.length - 1]) || 0,
    };
  }).filter((entry) => entry.timestamp && entry.endpoint && entry.query);
};

const LogsDetails: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const showToast = useCustomToast();

  const initializeLogFiles = () => {
    const initialLogFiles = logFileUrls.map((url, index) => {
      const jobId = parseInt(url?.split("/").pop()?.replace("job_", "").replace(".log", "") || `${index + 3}`, 10);
      const fileName = url ? url.split("/").pop() || `job_${jobId}.log` : `job_${jobId}.log`;
      const fileId = fileName.replace(".log", "");
      return {
        fileId,
        fileName,
        url,
        lastModified: new Date(Date.now() - index * 86400000).toISOString(),
        entries: null,
      };
    });
    setLogFiles(initialLogFiles);
    setIsLoading(false);
    // Fetch entries for the first log file immediately
    if (initialLogFiles.length > 0) {
      fetchLogEntries(initialLogFiles[0]);
    }
  };

  const fetchLogEntries = async (file: LogFile) => {
    if (!file.url || file.entries !== null) return;

    try {
      const response = await fetch(file.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to fetch ${file.fileName}: ${response.statusText}`);
      const content = await response.text();
      const entries = parseLogContent(content);

      setLogFiles((prev) =>
        prev.map((f) =>
          f.fileId === file.fileId ? { ...f, entries } : f
        )
      );
    } catch (err) {
      showToast(
        "Log Fetch Error",
        `Failed to load ${file.fileName}: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
      setLogFiles((prev) =>
        prev.map((f) =>
          f.fileId === file.fileId ? { ...f, entries: [] } : f
        )
      );
    }
  };

  const debouncedFetchLogFiles = useCallback(
    debounce(() => {
      setIsLoading(true);
      setLogFiles([]);
      initializeLogFiles();
    }, 500),
    []
  );

  useEffect(() => {
    initializeLogFiles();
  }, []);

  const getFilteredEntries = (entries: LogEntry[] | null) => {
    if (!entries) return [];
    return entries.filter((log) => filter === "all" || log.status === filter);
  };

  return (
    <Box p={4} width="100%">
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold">Log Details</Text>
        <Flex gap={2}>
          <Select
            size="sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as "all" | "success" | "error");
            }}
            width="150px"
          >
            <option value="all">All</option>
            <option value="success">Success Only</option>
            <option value="error">Errors Only</option>
          </Select>
          <Tooltip label="Refresh log files">
            <Button
              size="sm"
              colorScheme="blue"
              onClick={debouncedFetchLogFiles}
              isLoading={isLoading}
            >
              Refresh
            </Button>
          </Tooltip>
          <Button
            size="sm"
            colorScheme="teal"
            as={Link}
            to="/scraping-api/log-files"
          >
            Back to Log Files
          </Button>
        </Flex>
      </Flex>

      {isLoading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" color="blue.500" />
          <Text ml={4}>Loading log files...</Text>
        </Flex>
      ) : logFiles.length === 0 ? (
        <Text color="gray.500" textAlign="center">
          No log files available.
        </Text>
      ) : (
        <Box shadow="md" borderWidth="1px" borderRadius="md" overflowX="auto">
          <Accordion allowMultiple defaultIndex={[0]}> {/* Expand first log by default */}
            {logFiles.map((file) => (
              <AccordionItem key={file.fileId}>
                <AccordionButton onClick={() => fetchLogEntries(file)}>
                  <Box flex="1" textAlign="left">
                    <Text fontWeight="bold">{file.fileName}</Text>
                    <Text fontSize="sm" color="gray.500">
                      Last Modified: {new Date(file.lastModified).toLocaleString()} | Entries: {file.entries ? file.entries.length : "Not loaded"}
                    </Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  {file.entries === null ? (
                    <Flex justify="center" align="center" py={4}>
                      <Spinner size="sm" color="blue.500" />
                      <Text ml={2}>Loading entries...</Text>
                    </Flex>
                  ) : (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Timestamp</Th>
                          <Th>Endpoint</Th>
                          <Th>Query</Th>
                          <Th>Status</Th>
                          <Th>Response Time</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {getFilteredEntries(file.entries).map((log, index) => (
                          <Tr key={index} bg={log.status === "error" ? "red.900" : "transparent"}>
                            <Td>{new Date(log.timestamp).toLocaleString()}</Td>
                            <Td>{log.endpoint}</Td>
                            <Td>{log.query}</Td>
                            <Td>{log.status}</Td>
                            <Td>{log.responseTime} ms</Td>
                          </Tr>
                        ))}
                        {getFilteredEntries(file.entries).length === 0 && (
                          <Tr>
                            <Td colSpan={5} textAlign="center">
                              <Text color="gray.500">No logs match the current filter.</Text>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  )}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Box>
      )}
    </Box>
  );
};

export default LogsDetails;