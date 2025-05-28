import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Text,
  Flex,
  Badge,
  Spinner,
  Input,
  Button,
  Box,
  VStack,
  HStack,
  Select,
} from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import useCustomToast from "../../../hooks/useCustomToast";

interface UserAgent {
  id: string;
  user_agent: string;
  device: string;
  browser: string;
  os: string;
  percentage: number;
  lastUsed?: string;
  timeUsed?: number;
}

const UserAgentDashboard = () => {
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [browserFilter, setBrowserFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("lastUsed");
  const [isActive, setIsActive] = useState<boolean>(true);
  const showToast = useCustomToast();

  const fetchUserAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://api.thedataproxy.com/api/v2/user-agents/?skip=0&limit=100",
        { method: "GET", headers: { accept: "application/json" } }
      );
      if (!response.ok) throw new Error("Failed to fetch user agents");
      const data = await response.json();
     
      const enhancedData = (Array.isArray(data.data) ? data.data : []).map((agent: UserAgent, index: number) => ({
        ...agent,
        lastUsed: new Date(Date.now() - index * 3600000).toISOString(),
        timeUsed: Math.floor(Math.random() * 600),
      }));
      setUserAgents(enhancedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showToast("Fetch Error", errorMessage, "error");
      setUserAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAgents();
  }, []);

  const browserCategories = useMemo(() => ["all", ...new Set(userAgents.map((agent) => agent.browser))], [userAgents]);

  const filteredAndSortedUserAgents = useMemo(() => {
    return userAgents
      .filter((agent) => {
        const matchesSearch =
          agent.user_agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.browser.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.os.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(agent.percentage).includes(searchTerm.toLowerCase()) ||
          (agent.lastUsed && agent.lastUsed.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (agent.timeUsed && String(agent.timeUsed).includes(searchTerm.toLowerCase()));

        const matchesBrowser =
          browserFilter === "all" || agent.browser.toLowerCase() === browserFilter.toLowerCase();

        const matchesActivity = isActive ? agent.percentage > 0 : agent.percentage === 0;

        return matchesSearch && matchesBrowser && matchesActivity;
      })
      .sort((a, b) => {
        if (sortBy === "lastUsed") {
          return new Date(b.lastUsed || "1970-01-01").getTime() - new Date(a.lastUsed || "1970-01-01").getTime();
        } else if (sortBy === "percentage") {
          return b.percentage - a.percentage;
        } else if (sortBy === "timeUsed") {
          return (b.timeUsed || 0) - (a.timeUsed || 0);
        } else if (sortBy === "name") {
          return a.user_agent.localeCompare(b.user_agent);
        }
        return 0;
      });
  }, [userAgents, searchTerm, browserFilter, isActive, sortBy]);

  if (loading && userAgents.length === 0) {
    return (
      <Container maxW="full" py={10} textAlign="center">
        <Spinner size="xl" color="blue.500" />
      </Container>
    );
  }

  return (
    <Container maxW="full" py={6} color="white">
      <Flex direction="column" gap={4}>
        <Flex align="center" justify="space-between" py={2} flexWrap="wrap" gap={4}>
          <Box textAlign="left" flex="1">
            <Text fontSize="xl" fontWeight="bold">
              User Agents Dashboard
            </Text>
            <Text fontSize="sm" color="gray.500">
              View and manage user agents for scraping operations.
            </Text>
          </Box>
        </Flex>

        <Flex gap={4} justify="space-between" align="center" flexWrap="wrap">
          <Input
            placeholder="Search user agents..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            w={{ base: "100%", md: "250px" }}
            aria-label="Search user agents"
            color="white"
            borderColor="gray.600"
            _hover={{ borderColor: "gray.500" }}
            _focus={{ borderColor: "blue.400" }}
          />
          <HStack spacing={4} ml={{ md: "auto" }} align="center" flexWrap="wrap">
            {browserCategories.map((browser) => (
              <Button
                key={browser}
                size="sm"
                fontWeight="bold"
                borderRadius="full"
                colorScheme={browserFilter === browser ? "purple" : "gray"}
                variant={browserFilter === browser ? "solid" : "outline"}
                onClick={() => {
                  setBrowserFilter(browser);
                }}
              >
                {browser === "all" ? "All" : browser}
              </Button>
            ))}
            <Button
              size="sm"
              fontWeight="bold"
              borderRadius="full"
              colorScheme={isActive ? "teal" : "orange"}
              variant="solid"
              onClick={() => {
                setIsActive(!isActive);
              }}
            >
              {isActive ? "Active" : "Inactive"}
            </Button>
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
              }}
              size="sm"
              w={{ base: "100%", md: "220px" }}
              borderColor="green.500"
              _hover={{ borderColor: "green.600" }}
              _focus={{ borderColor: "green.700", boxShadow: "0 0 0 1px green.700" }}
              bg="white"
              color="gray.800"
              sx={{
                "> option": {
                  bg: "white",
                  color: "gray.800",
                },
              }}
            >
              <option value="lastUsed">Last Used</option>
              <option value="percentage">Percentage</option>
              <option value="timeUsed">Time Used</option>
              <option value="name">Name</option>
            </Select>
          </HStack>
        </Flex>

        <VStack spacing={4} align="stretch">
          {filteredAndSortedUserAgents.length === 0 ? (
            <Text color="gray.500" textAlign="center">
              No user agents found matching your criteria.
            </Text>
          ) : (
            filteredAndSortedUserAgents.map((agent) => (
              <Box key={agent.id} p="4" borderWidth="1px" borderRadius="lg">
                <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                  <Box flex="1">
                    <Text
                      display="inline"
                      fontWeight="bold"
                      color="blue.400"
                      _hover={{ textDecoration: "underline" }}
                    >
                      {agent.user_agent}
                    </Text>
                    <Badge
                      colorScheme={agent.percentage > 0 ? "green" : "red"}
                      variant="solid"
                      ml={2}
                    >
                      {agent.percentage > 0 ? "Active" : "Inactive"}
                    </Badge>
                    <Text fontSize="sm" color="gray.300" mt={1}>
                      <strong>Device:</strong> {agent.device || "N/A"}, <strong>OS:</strong>{" "}
                      {agent.os || "N/A"}, <strong>Percentage:</strong> {agent.percentage}%
                    </Text>
                    <Text fontSize="sm" color="gray.300" mt={1}>
                      <strong>Last Used:</strong> {agent.lastUsed ? new Date(agent.lastUsed).toLocaleString() : "N/A"},{" "}
                      <strong>Time Used:</strong> {agent.timeUsed ? `${agent.timeUsed}s` : "N/A"}
                    </Text>
                  </Box>
                  <Box textAlign="right">
                    <Text fontSize="sm" fontWeight="semibold" color="gray.400">
                      {agent.browser || "Unknown"}
                    </Text>
                  </Box>
                </Flex>
              </Box>
            ))
          )}
        </VStack>
      </Flex>
    </Container>
  );
};

export const Route = createFileRoute("/_layout/scraping-api/user-agents")({
  component: UserAgentDashboard,
});

export default UserAgentDashboard;