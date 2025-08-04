import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  Divider,
  Flex,
  HStack,
  Input,
  Select,
  Badge,
} from "@chakra-ui/react";
import { FiGithub } from "react-icons/fi";
import PromoSERP from "../../../components/ComingSoon";
import ApiStatusManagement from "../../../components/UserSettings/ApiStatusManagement";

interface JobSummary {
  id: number;
  inputFile: string;
  fileEnd: string | null;
  user: string;
  rec: number;
  img: number;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  isTrial: boolean;
  isDeactivated: boolean;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token");
};

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = getAuthToken();
  const response = await fetch("https://api.iconluxury.today/api/v1/subscription-status/serp", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized: Please log in again.");
    }
    throw new Error(`Failed to fetch subscription status: ${response.status}`);
  }
  return response.json();
}

async function fetchJobs(page: number): Promise<JobSummary[]> {
  const token = getAuthToken();
  const response = await fetch(`https://external.iconluxury.today/api/scraping-jobs?page=${page}&page_size=10`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch jobs: ${response.status}`);
  return response.json();
}

export const Route = createFileRoute("/_layout/scraping-api/explore")({
  component: Explore,
});

function Explore() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");

  const { data: subscriptionStatus, isLoading: isSubLoading, error: subError } = useQuery({
    queryKey: ["subscriptionStatus", "serp"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message.includes("Unauthorized")) return false;
      return failureCount < 3;
    },
  });

  const { data: freshJobs, isFetching } = useQuery({
    queryKey: ["scraperJobs", page],
    queryFn: () => fetchJobs(page),
    placeholderData: keepPreviousData,
    enabled: !!subscriptionStatus?.hasSubscription || !!subscriptionStatus?.isTrial,
  });

  const { data: apiStatusSettings } = useQuery({
    queryKey: ["apiStatusSettings"],
    queryFn: () => {
      const storedSettings = localStorage.getItem("apiStatusSettings");
      return storedSettings ? JSON.parse(storedSettings) : {
        "dev-service-distro-image": { isActive: true, isLimited: false, isDeactivated: false },
        "prod-service-distro-image": { isActive: true, isLimited: false, isDeactivated: false },
        "beta-service-distro-image": { isActive: true, isLimited: false, isDeactivated: false },
      };
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (freshJobs) {
      setJobs((prev) => (page === 1 ? freshJobs : [...prev, ...freshJobs]));
    }
  }, [freshJobs, page]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.inputFile.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && job.fileEnd !== null) ||
      (statusFilter === "pending" && job.fileEnd === null);
    return matchesSearch && matchesStatus;
  });

  const handleLoadMore = () => setPage((prev) => prev + 1);

  if (isSubLoading) {
    return (
      <Container maxW="full" bg="white" color="gray.800">
        <Text>Loading your data...</Text>
      </Container>
    );
  }

  if (subError) {
    return (
      <Container maxW="full" bg="white" color="gray.800">
        <Text color="red.500">
          {subError.message === "Unauthorized: Please log in again."
            ? "Session expired. Please log in again."
            : "Error loading status. Please try again later."}
        </Text>
        {subError.message.includes("Unauthorized") && (
          <Button mt={4} colorScheme="blue" onClick={() => navigate({ to: "/login" })}>
            Log In
          </Button>
        )}
      </Container>
    );
  }

  const { hasSubscription, isTrial, isDeactivated } = subscriptionStatus || {
    hasSubscription: false,
    isTrial: false,
    isDeactivated: false,
  };
  const isLocked = !hasSubscription && !isTrial;
  const isFullyDeactivated = isDeactivated && !hasSubscription;

  // Get status for each environment
  const devStatus = apiStatusSettings?.["dev-service-distro-image"] || { isActive: true, isLimited: false, isDeactivated: false };
  const prodStatus = apiStatusSettings?.["prod-service-distro-image"] || { isActive: true, isLimited: false, isDeactivated: false };
  const betaStatus = apiStatusSettings?.["beta-service-distro-image"] || { isActive: true, isLimited: false, isDeactivated: false };

  const getStatusBadge = (status: { isActive: boolean; isLimited: boolean; isDeactivated: boolean }) => {
    if (status.isDeactivated) return { text: "Down", color: "red" };
    if (status.isLimited) return { text: "Limited", color: "yellow" };
    if (status.isActive) return { text: "Active", color: "green" };
    return { text: "Unknown", color: "red" };
  };

  const devBadge = getStatusBadge(devStatus);
  const prodBadge = getStatusBadge(prodStatus);
  const betaBadge = getStatusBadge(betaStatus);

  return (
    <Container maxW="full" bg="white" color="gray.800">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">Scraping Jobs</Text>
          <Text fontSize="sm" color="gray.600">View and manage scraping jobs</Text>
        </Box>
      </Flex>

      <Divider my={4} borderColor="gray.200" />

      {isLocked ? (
        <PromoSERP />
      ) : isFullyDeactivated ? (
        <Flex justify="space-between" align="center" w="full" p={4} bg="red.50" borderRadius="md">
          <Text color="gray.800">Your tools have been deactivated.</Text>
          <Button colorScheme="red" onClick={() => navigate({ to: "/proxies/pricing" })}>
            Reactivate Now
          </Button>
        </Flex>
      ) : (
        <Flex gap={6} justify="space-between" align="stretch" wrap="wrap">
          <Box flex="1" minW={{ base: "100%", md: "65%" }}>
            <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
              <Input
                placeholder="Search Jobs by Input File..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                w={{ base: "100%", md: "250px" }}
                borderColor="green.300"
                _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
                _hover={{ borderColor: "green.400" }}
                bg="white"
                color="gray.800"
                _placeholder={{ color: "gray.500" }}
                borderRadius="md"
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "completed" | "pending")}
                w={{ base: "100%", md: "200px" }}
                borderColor="green.300"
                _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
                _hover={{ borderColor: "green.400" }}
                bg="white"
                color="gray.700"
                borderRadius="md"
                sx={{
                  "& option": {
                    color: "gray.700",
                    backgroundColor: "white",
                    _hover: { backgroundColor: "green.50" },
                  },
                }}
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </Select>
            </Flex>
            <VStack spacing={4} align="stretch">
              {filteredJobs.map((job) => (
                <Box key={job.id} p="4" borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" color="gray.600">
                        Job ID: {job.id}
                      </Text>
                      <Text fontWeight="medium" color="gray.800">{job.inputFile}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {job.rec} records, {job.img} images
                      </Text>
                      <Text fontSize="sm" color={job.fileEnd ? "green.500" : "yellow.500"}>
                        Status: {job.fileEnd ? "Completed" : "Pending"}
                      </Text>
                    </Box>
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() =>
                        navigate({
                          to: "/scraping-api/scraping-jobs/$jobId",
                          params: { jobId: job.id.toString() },
                        })
                      }
                    >
                      View Details
                    </Button>
                  </Flex>
                </Box>
              ))}
              {filteredJobs.length === 0 && !isFetching && (
                <Text fontSize="sm" color="gray.500">No jobs match your criteria</Text>
              )}
              {isFetching ? (
                <Text fontSize="sm" color="gray.500">Loading more...</Text>
              ) : (
                filteredJobs.length > 0 && (
                  <Button
                    colorScheme="green"
                    size="sm"
                    onClick={handleLoadMore}
                    mt={4}
                    alignSelf="center"
                  >
                    Load More
                  </Button>
                )
              )}
            </VStack>
          </Box>

          {/* <Box w={{ base: "100%", md: "250px" }} p="4" borderLeft={{ md: "1px solid" }} borderColor="gray.200">
            <VStack spacing="4" align="stretch">
              <Text fontWeight="bold" color="black">Quick Actions</Text>
              <Button
                as="a"
                href="/scraping-api/submit-form/google-serp"
                variant="outline"
                size="sm"
                colorScheme="green"
              >
                Submit Form
              </Button>
              <Button
                as="a"
                href="https://github.com/iconluxurytoday"
                leftIcon={<FiGithub />}
                variant="outline"
                size="sm"
                colorScheme="blue"
              >
                GitHub
              </Button>
              <Divider />
              <Text fontWeight="bold" color="black">Ray Dashboard</Text>
              <Button
                as="a"
                href="https://ray-distro-image.popovtech.com"
                target="_blank"
                colorScheme="blue"
                size="sm"
                variant="outline"
                isDisabled={devStatus.isDeactivated}
              >
                dev service-distro-image
              </Button>
              <Button
                as="a"
                href="https://ray-distro-image.popovtech.com"
                target="_blank"
                colorScheme="blue"
                size="sm"
                variant="outline"
                isDisabled={prodStatus.isDeactivated}
              >
                prod service-distro-image
              </Button>
              <Divider />
              <Text fontWeight="bold" color="black">API Reference</Text>
              <HStack justify="space-between" align="center">
                <Text color="gray.700">(dev service-distro-image)</Text>
                <Badge colorScheme={devBadge.color}>{devBadge.text}</Badge>
              </HStack>
              <HStack spacing={2}>
                <Button
                  as="a"
                  href="https://dev-image-distro.popovtech.com/redoc"
                  target="_blank"
                  colorScheme="blue"
                  size="sm"
                  variant="outline"
                  isDisabled={devStatus.isDeactivated}
                >
                  Redoc
                </Button>
                <Button
                  as="a"
                  href="https://dev-image-distro.popovtech.com/docs"
                  target="_blank"
                  colorScheme="blue"
                  size="sm"
                  variant="outline"
                  isDisabled={devStatus.isDeactivated}
                >
                  Openapi
                </Button>
              </HStack>
              <HStack justify="space-between" align="center">
                <Text color="gray.700">(prod service-distro-image)</Text>
                <Badge colorScheme={prodBadge.color}>{prodBadge.text}</Badge>
              </HStack>
              <HStack spacing={2}>
                <Button
                  as="a"
                  href="https://image-backend-cms-icon-7.popovtech.com/redoc"
                  target="_blank"
                  colorScheme="blue"
                  size="sm"
                  variant="outline"
                  isDisabled={prodStatus.isDeactivated}
                >
                  Redoc
                </Button>
                <Button
                  as="a"
                  href="https://image-backend-cms-icon-7.popovtech.com/docs"
                  target="_blank"
                  colorScheme="blue"
                  size="sm"
                  variant="outline"
                  isDisabled={prodStatus.isDeactivated}
                >
                  Openapi
                </Button>
              </HStack>
              <HStack justify="space-between" align="center">
                <Text color="gray.700">(beta service-distro-image)</Text>
                <Badge colorScheme={betaBadge.color}>{betaBadge.text}</Badge>
              </HStack>
              <HStack spacing={2}>
                <Button
                  as="a"
                  href="https://beta-image-backend-cms-icon-7.popovtech.com/redoc"
                  target="_blank"
                  colorScheme="blue"
                  size="sm"
                  variant="outline"
                  isDisabled={betaStatus.isDeactivated}
                >
                  Redoc
                </Button>
                <Button
                  as="a"
                  href="https://beta-image-backend-cms-icon-7.popovtech.com/docs"
                  target="_blank"
                  colorScheme="blue"
                  size="sm"
                  variant="outline"
                  isDisabled={betaStatus.isDeactivated}
                >
                  Openapi
                </Button>
              </HStack>
              <Divider />
            </VStack>
          </Box> */}
        </Flex>
      )}
    </Container>
  );
}

export default Explore;