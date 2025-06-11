import React, { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import {
  Container,
  Box,
  Text,
  Flex,
  Spinner,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Badge,
  Heading,
  VStack,
  Link,
} from "@chakra-ui/react";
import useCustomToast from "../../../hooks/useCustomToast"; // Assuming the hook's path

// --- INTERFACES ---

// Simplified interface for job details needed on this page
interface JobDetails {
  id: number;
  inputFile: string;
  fileLocationUrl: string;
  fileEnd?: string;
  fileStart: string;
}

// Interface for the progress data from the API
interface ProgressData {
  fileId: number;
  totalRecords: number;
  step1Completed: number;
  step1Progress: number;
  // Include other steps if your API provides them
  // step2Completed: number;
  // step2Progress: number;
}


// --- COMPONENT ---

/**
 * A standalone page to display the real-time progress of a single scraping job.
 * It fetches job details and polls for progress updates until the job is complete.
 */
const JobProgressPage = () => {
  const { jobId } = useParams({ from: "/_layout/progress/$jobId" }) as { jobId: string };
  const [jobData, setJobData] = useState<JobDetails | null>(null);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const showToast = useCustomToast();

  // Effect 1: Fetch initial job data once on component mount
  useEffect(() => {
    const fetchJobData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = `https://backend-dev.iconluxury.group/api/scraping-jobs/${jobId}`;
        const response = await fetch(apiUrl);
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

    fetchJobData();
  }, [jobId, showToast]);

  // Effect 2: Poll for progress data if the job is running
  useEffect(() => {
    // Start polling only if we have job data and the job is not finished.
    if (!jobData || jobData.fileEnd) {
      setProgressData(null); // Clear progress if job is done or no data
      return;
    }

    let isCancelled = false;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`https://backend-dev.iconluxury.group/api/scraping-jobs/${jobId}/progress`);
        if (response.ok) {
          const data: ProgressData = await response.json();
          if (!isCancelled) {
            setProgressData(data);

            // If progress hits 100%, refetch the main job data to get the final `fileEnd` timestamp
            // This ensures the UI updates to "Completed" without a manual refresh.
            if (data.step1Progress >= 100) {
              const jobResponse = await fetch(`https://backend-dev.iconluxury.group/api/scraping-jobs/${jobId}`);
              if (jobResponse.ok) {
                const updatedJobData: JobDetails = await jobResponse.json();
                if (updatedJobData.fileEnd) {
                  setJobData(updatedJobData); // Update state to reflect completion
                }
              }
            }
          }
        } else {
          console.error("Failed to fetch job progress:", response.statusText);
        }
      } catch (err) {
        console.error("Error polling for job progress:", err);
      }
    };

    fetchProgress(); // Initial fetch
    const intervalId = setInterval(fetchProgress, 5000); // Poll every 5 seconds

    // Cleanup function to stop polling when component unmounts or dependencies change
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [jobData, jobId]); // Reruns when jobData is initially fetched

  // --- RENDER LOGIC ---

  if (isLoading) {
    return (
      <Container centerContent maxW="container.md" py={10}>
        <Flex direction="column" align="center" justify="center" h="200px">
          <Spinner size="xl" color="green.300" />
          <Text mt={4} color="gray.600">Loading Job Details...</Text>
        </Flex>
      </Container>
    );
  }

  if (error || !jobData) {
    return (
      <Container centerContent maxW="container.md" py={10}>
        <Text color="red.500" fontSize="lg" textAlign="center">
            {error || "Job data could not be loaded."}
        </Text>
      </Container>
    );
  }
  
  // Define progress steps based on the available data
  const progressSteps = progressData ? [
    { label: "Processing Records", completed: progressData.step1Completed, progress: progressData.step1Progress },
  ] : [];

  return (
    <Container maxW="container.lg" py={8} bg="gray.50" minH="100vh">
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="xl" color="gray.800">
            Job Progress Tracker
          </Heading>
          <Text fontSize="md" color="gray.500" mt={1}>
            Live status for Job ID: {jobData.id}
          </Text>
        </Box>

        {/* Job Details Card */}
        <Card variant="outline" borderWidth="1px" borderColor="gray.200" shadow="sm">
          <CardBody>
            <Flex justify="space-around" wrap="wrap" gap={6}>
              <Stat>
                <StatLabel color="gray.600">Input File</StatLabel>
                <StatHelpText wordBreak="break-all" maxW="300px">
                  <Link href={jobData.fileLocationUrl} isExternal color="green.500" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>
                    {jobData.inputFile}
                  </Link>
                </StatHelpText>
              </Stat>
              <Stat textAlign="center">
                <StatLabel color="gray.600">Status</StatLabel>
                <StatNumber>
                  <Badge fontSize="md" px={3} py={1} borderRadius="md" colorScheme={jobData.fileEnd ? "green" : "yellow"}>
                    {jobData.fileEnd ? "Completed" : "In Progress"}
                  </Badge>
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="gray.600">Start Time</StatLabel>
                <StatNumber color="gray.700" fontSize="lg">
                    {new Date(jobData.fileStart).toLocaleString()}
                </StatNumber>
              </Stat>
               {jobData.fileEnd && (
                <Stat>
                  <StatLabel color="gray.600">Processing Duration</StatLabel>
                  <StatNumber color="gray.700" fontSize="lg">
                    {((new Date(jobData.fileEnd).getTime() - new Date(jobData.fileStart).getTime()) / 1000 / 60).toFixed(2)} minutes
                  </StatNumber>
                </Stat>
              )}
            </Flex>
          </CardBody>
        </Card>

        {/* Progress Bar Section - only shows when job is running */}
        {progressData && !jobData.fileEnd && (
          <Card variant="outline" borderWidth="1px" borderColor="gray.200" shadow="sm">
            <CardBody>
                <Heading as="h3" size="md" mb={6} color="gray.700" textAlign="center">
                    Live Progress
                </Heading>
              <VStack spacing={6}>
                {progressSteps.map((step, index) => (
                  <Box key={index} w="100%">
                    <Flex justify="space-between" align="baseline" mb={1}>
                      <Text fontWeight="medium" color="gray.800">{step.label}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {step.completed} / {progressData.totalRecords} records
                      </Text>
                    </Flex>
                    <Progress
                      value={step.progress}
                      size="lg"
                      colorScheme="green"
                      hasStripe={Number(step.progress) < 100}
                      isAnimated={Number(step.progress) < 100}
                      borderRadius="md"
                    />
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
        
        {/* Completion Message - only shows when job is done */}
        {jobData.fileEnd && (
            <Flex direction="column" align="center" justify="center" p={8} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
                 <Heading as="h3" size="md" color="green.700">
                    Processing Complete!
                 </Heading>
                 <Text mt={2} color="green.600">The job finished successfully.</Text>
            </Flex>
        )}
      </VStack>
    </Container>
  );
};


// --- ROUTE DEFINITION ---

// Defines the route for this new page within the TanStack Router setup.
// This should be in a file like: `src/routes/_layout/scraping-api/scraping-jobs/$jobId/progress-only.tsx`
export const Route = createFileRoute("/_layout/progress/$jobId")({
  component: JobProgressPage,
});

export default JobProgressPage;