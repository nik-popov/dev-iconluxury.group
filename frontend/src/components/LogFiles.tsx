// src/components/LogFiles.tsx
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
  Tooltip,
} from "@chakra-ui/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import useCustomToast from "./../hooks/useCustomToast"; // Ensure path is correct
import debounce from "lodash/debounce";

interface LogFile {
  fileId: string;
  fileName: string;
  url: string | null;
  lastModified: string;
  entries: LogEntry[] | null; // Not used here, but kept for consistency
}

interface LogEntry {
  timestamp: string;
  endpoint: string;
  query: string;
  status: "success" | "error";
  responseTime: number;
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

const LogFiles: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
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

  const handleDownload = (url: string | null) => {
    if (url) { // Explicitly check for null and narrow type to string
      window.open(url, "_blank");
      showToast("File Opened", `Opened ${url.split("/").pop()} in new tab`, "info");
    }
  };

  return (
    <Box p={4} width="100%">
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold">Log Files</Text>
        <Flex gap={2}>
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
            to="/scraping-api/log-details"
          >
            View Details
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
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>File Name</Th>
                <Th>Last Modified</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logFiles.map((file) => (
                <Tr key={file.fileId}>
                  <Td>{file.fileName}</Td>
                  <Td>{new Date(file.lastModified).toLocaleString()}</Td>
                  <Td>
                    {file.url ? (
                      <Button
                        size="xs"
                        colorScheme="teal"
                        onClick={() => handleDownload(file.url)}
                      >
                        Download
                      </Button>
                    ) : (
                      <Text fontSize="xs" color="gray.500">No file</Text>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default LogFiles;