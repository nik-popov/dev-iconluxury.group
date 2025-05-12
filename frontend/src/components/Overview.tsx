import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Flex,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  ButtonGroup,
  Card,
  CardBody,
  IconButton,
  Tooltip,
  Select,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

interface Query {
  query: string;
  count: number;
  category?: string;
  avgLatencyMs?: number;
  lastRun?: string;
  errorRate?: number;
}

interface TimeSeries {
  date: string;
  requests: number;
  successRate: number;
  cost: number;
  latencyAvgMs: number;
}

interface EndpointData {
  endpoint: string;
  requestsToday: number;
  totalQueries: number;
  successRate: number;
  queries?: Query[];
  gigsUsedToday: number;
  costToday: number;
  timeSeries: TimeSeries[];
}

interface OverviewProps {
  endpointId: string;
}

// Define interfaces for chart data
interface ChartItem {
  name: string;
  value: number;
  compareValue?: number;
}

interface QueryDistributionItem {
  name: string;
  value: number;
}

interface CostItem {
  name: string;
  value: number;
  compareValue: number;
}

// Index signature for chartData
interface ChartData {
  requests: ChartItem[];
  successRate: ChartItem[];
  latency: ChartItem[];
  queryDistribution: QueryDistributionItem[];
  cost: CostItem[];
  [key: string]: ChartItem[] | QueryDistributionItem[] | CostItem[];
}

const chartOptions = [
  { key: "requests", label: "Requests", color: "#805AD5", yLabel: "Requests" },
  { key: "successRate", label: "Success vs Error", color: "#38A169", yLabel: "Percentage (%)" },
  { key: "latency", label: "Avg Latency", color: "#DD6B20", yLabel: "Latency (ms)" },
  { key: "queryDistribution", label: "Query Distribution", color: "#C53030", yLabel: "Count" },
  { key: "cost", label: "Cost Trend", color: "#2B6CB0", yLabel: "Cost ($)" },
];

const PIE_COLORS = ["#805AD5", "#38A169", "#DD6B20", "#C53030", "#2B6CB0", "#D69E2E", "#9F7AEA", "#4A5568"];
const COMPARE_COLORS = ["#805AD5", "#E53E3E"];

const Overview: React.FC<OverviewProps> = ({ endpointId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allEndpoints, setAllEndpoints] = useState<EndpointData[]>([]);
  const [endpointData, setEndpointData] = useState<EndpointData | null>(null);
  const [compareEndpointData, setCompareEndpointData] = useState<EndpointData | null>(null);
  const [selectedChart, setSelectedChart] = useState("requests");
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [compareEndpointId, setCompareEndpointId] = useState<string>("");

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://s3.us-east-1.amazonaws.com/iconluxury.group/endpoint-overview.json",
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: EndpointData[] = await response.json();
      setAllEndpoints(data);
      const primaryData = data.find((item) => item.endpoint === endpointId);
      if (!primaryData) {
        throw new Error(`Endpoint ${endpointId} not found in the data`);
      }
      setEndpointData(primaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setEndpointData(null);
      setAllEndpoints([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpointId]);

  useEffect(() => {
    if (compareEndpointId) {
      const compareData = allEndpoints.find((item) => item.endpoint === compareEndpointId);
      setCompareEndpointData(compareData || null);
    } else {
      setCompareEndpointData(null);
    }
  }, [compareEndpointId, allEndpoints]);

  useEffect(() => {
    setSelectedQuery(null);
  }, [selectedChart]);

  if (isLoading) {
    return <Flex justify="center" align="center" h="200px"><Spinner size="xl" color="blue.500" /></Flex>;
  }

  if (error) {
    return (
      <Box>
        <Text color="red.500">{error}</Text>
        <Button mt={2} onClick={fetchData}>Retry</Button>
      </Box>
    );
  }

  if (!endpointId || !endpointData) {
    return (
      <Box p={4}>
        <Text fontSize="lg" fontWeight="bold" mb={4}>Overview</Text>
        <Text color="gray.400">No endpoint specified or data available.</Text>
      </Box>
    );
  }

  const calculateMetrics = (data: EndpointData) => {
    const processedRequests = Math.round((data.requestsToday || 0) * 0.9);
    const failedRequests = (data.requestsToday || 0) - processedRequests;
    const avgLatency = (data.queries || []).reduce((sum, q) => sum + (q.avgLatencyMs || 0), 0) / ((data.queries || []).length || 1);
    return { processedRequests, failedRequests, avgLatency };
  };

  const primaryMetrics = calculateMetrics(endpointData);
  const compareMetrics = compareEndpointData ? calculateMetrics(compareEndpointData) : null;

  const chartData: ChartData = {
    requests: [
      { name: "Total Requests", value: endpointData.requestsToday || 0, compareValue: compareEndpointData?.requestsToday || 0 },
      { name: "Processed", value: primaryMetrics.processedRequests || 0, compareValue: compareMetrics?.processedRequests || 0 },
      { name: "Failed", value: primaryMetrics.failedRequests || 0, compareValue: compareMetrics?.failedRequests || 0 },
    ],
    successRate: [
      { name: "Success Rate", value: endpointData.successRate || 0, compareValue: compareEndpointData?.successRate || 0 },
      { name: "Error Rate", value: (100 - (endpointData.successRate || 0)), compareValue: compareEndpointData ? (100 - (compareEndpointData.successRate || 0)) : 0 },
    ],
    latency: [
      { name: "Avg Latency", value: primaryMetrics.avgLatency || 0, compareValue: compareMetrics?.avgLatency || 0 },
    ],
    queryDistribution: (endpointData.queries || []).reduce((acc: QueryDistributionItem[], q) => {
      const existing = acc.find(item => item.name === (q.category || "Uncategorized"));
      if (existing) {
        existing.value += q.count || 0;
      } else {
        acc.push({ name: q.category || "Uncategorized", value: q.count || 0 });
      }
      return acc;
    }, [])
      .filter(item => item.value > 0),
    cost: (endpointData.timeSeries || []).map((ts) => ({
      name: ts.date,
      value: ts.cost || 0,
      compareValue: compareEndpointData?.timeSeries?.find(cts => cts.date === ts.date)?.cost || 0
    })),
  };

  const topQueries = [...(endpointData.queries || [])]
    .filter(q => (q.count || 0) > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10);

  const renderSummary = () => {
    const stats = getSummaryStats(selectedChart);
    return (
      <CardBody>
        {stats.map((stat, index) => (
          <Stat key={index}>
            <StatLabel>{stat.label}</StatLabel>
            <StatNumber>{stat.value}</StatNumber>
          </Stat>
        ))}
      </CardBody>
    );
  };

  const getSummaryStats = (selectedChart: string) => {
    const data = chartData[selectedChart] || [];
    if (selectedChart === "cost") {
      if (data.length === 0) return [];
      const latestPrimary = (data as CostItem[])[data.length - 1]?.value || 0;
      const latestCompare = compareEndpointData ? ((data as CostItem[])[data.length - 1]?.compareValue || 0) : null;
      const totalPrimary = (data as CostItem[]).reduce((sum: number, item: CostItem) => sum + (item.value || 0), 0);
      const totalCompare = compareEndpointData ? (data as CostItem[]).reduce((sum: number, item: CostItem) => sum + (item.compareValue || 0), 0) : null;
      const avgPrimary = totalPrimary / data.length;
      const avgCompare = compareEndpointData ? (totalCompare || 0) / data.length : null;
      let trendPrimary = "Stable";
      let trendCompare = compareEndpointData ? "Stable" : null; // Ensure trendCompare is null if no comparison
      if (data.length > 1) {
        const prevPrimary = (data as CostItem[]).slice(0, -1).reduce((sum: number, item: CostItem) => sum + (item.value || 0), 0) / (data.length - 1);
        trendPrimary = latestPrimary > prevPrimary ? "Increasing" : "Decreasing";
        if (compareEndpointData) {
          const prevCompare = (data as CostItem[]).slice(0, -1).reduce((sum: number, item: CostItem) => sum + (item.compareValue || 0), 0) / (data.length - 1);
          trendCompare = (latestCompare || 0) > prevCompare ? "Increasing" : "Decreasing";
        }
      }
      // Updated formatValue to accept undefined
      const formatValue = (primary: number | string, compare: number | string | null | undefined) =>
        compare != null ? `${primary} / ${compare}` : primary;
      return [
        { label: "Latest Cost", value: formatValue(latestPrimary.toLocaleString(), latestCompare?.toLocaleString()) },
        { label: "Total Cost", value: formatValue(totalPrimary.toLocaleString(), totalCompare?.toLocaleString()) },
        { label: "Avg Daily Cost", value: formatValue(avgPrimary.toFixed(2), avgCompare?.toFixed(2)) },
        { label: "Trend", value: formatValue(trendPrimary, trendCompare) },
      ];
    }

    if (selectedChart === "queryDistribution") {
      const total = (data as QueryDistributionItem[]).reduce((sum: number, item: QueryDistributionItem) => sum + item.value, 0);
      return (data as QueryDistributionItem[]).map((item: QueryDistributionItem) => ({
        label: item.name,
        value: `${item.value.toLocaleString()} (${((item.value / total) * 100).toFixed(1)}%)`,
      }));
    }

    return (data as ChartItem[]).map((item: ChartItem) => ({
      label: item.name,
      value: compareEndpointData
        ? `${(item.value || 0).toLocaleString()} / ${(item.compareValue || 0).toLocaleString()}`
        : (item.value || 0).toLocaleString(),
    }));
  };

  const selectedOption = chartOptions.find((opt) => opt.key === selectedChart) || chartOptions[0];

  const renderChart = () => {
    const data = chartData[selectedChart] || [];
    if (!data.length) return <Text>No data available for this chart</Text>;

    const chartProps = {
      margin: { top: 20, right: 20, bottom: showLabels ? 60 : 20, left: showLabels ? 40 : 20 },
      children: [
        <CartesianGrid key="grid" stroke="gray.600" />,
        <XAxis
          key="xaxis"
          dataKey="name"
          stroke="#FFFFFF"
          tick={{ fill: "#FFFFFF", fontSize: 12 }}
          tickMargin={10}
          angle={selectedChart === "cost" ? -45 : 0}
          textAnchor={selectedChart === "cost" ? "end" : "middle"}
          label={
            showLabels
              ? { value: selectedChart === "cost" ? "Date" : "Metrics", position: "insideBottom", offset: -20, fill: "#FFFFFF" }
              : undefined
          }
        />,
        <YAxis
          key="yaxis"
          stroke="#FFFFFF"
          tick={{ fill: "#FFFFFF", fontSize: 12 }}
          tickMargin={10}
          label={
            showLabels
              ? { value: selectedOption.yLabel, angle: -45, position: "insideLeft", offset: -20, fill: "#FFFFFF" }
              : undefined
          }
        />,
        <RechartsTooltip key="tooltip" contentStyle={{ backgroundColor: "gray.700", color: "white" }} />,
        <Legend key="legend" verticalAlign="top" height={36} />,
      ],
    };

    switch (selectedChart) {
      case "requests":
      case "successRate":
      case "latency":
        return (
          <BarChart {...chartProps} data={data}>
            {chartProps.children}
            <Bar dataKey="value" fill={COMPARE_COLORS[0]} name={endpointId} />
            {compareEndpointData && (
              <Bar dataKey="compareValue" fill={COMPARE_COLORS[1]} name={compareEndpointData.endpoint} />
            )}
          </BarChart>
        );
      case "queryDistribution":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={showLabels ? ({ name, value }) => `${name}: ${value}` : false}
              labelLine={true}
            >
              {(data as QueryDistributionItem[]).map((_, index: number) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={{ backgroundColor: "gray.700", color: "white" }} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        );
      case "cost":
        return (
          <LineChart {...chartProps} data={data}>
            {chartProps.children}
            <Line type="monotone" dataKey="value" stroke={COMPARE_COLORS[0]} name={endpointId} />
            {compareEndpointData && (
              <Line type="monotone" dataKey="compareValue" stroke={COMPARE_COLORS[1]} name={compareEndpointData.endpoint} />
            )}
          </LineChart>
        );
      default:
        return <Text>Unknown chart type</Text>;
    }
  };

  return (
    <Box p={4} width="100%">
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
        <Text fontSize="lg" fontWeight="bold">Overview for {endpointId}</Text>
        <Flex align="center" gap={2}>
          <Select
            size="sm"
            placeholder="Compare to..."
            value={compareEndpointId}
            onChange={(e) => setCompareEndpointId(e.target.value)}
            width="200px"
          >
            {allEndpoints
              .filter((item) => item.endpoint !== endpointId)
              .map((item) => (
                <option key={item.endpoint} value={item.endpoint}>{item.endpoint}</option>
              ))}
          </Select>
          <ButtonGroup size="sm" variant="outline">
            {chartOptions.map((option) => (
              <Tooltip key={option.key} label={`View ${option.label}`}>
                <Button
                  bg={selectedChart === option.key ? option.color : "gray.600"}
                  color={selectedChart === option.key ? "white" : "gray.200"}
                  borderColor={option.color}
                  _hover={{ bg: `${option.color}80` }}
                  onClick={() => setSelectedChart(option.key)}
                >
                  {option.label}
                </Button>
              </Tooltip>
            ))}
          </ButtonGroup>
          <Tooltip label="Refresh overview data">
            <Button size="sm" colorScheme="blue" onClick={fetchData} isLoading={isLoading}>
              Refresh
            </Button>
          </Tooltip>
          <Tooltip label="Toggle chart labels">
            <Button
              size="sm"
              colorScheme={showLabels ? "green" : "gray"}
              onClick={() => setShowLabels(!showLabels)}
            >
              {showLabels ? "Labels: On" : "Labels: Off"}
            </Button>
          </Tooltip>
        </Flex>
      </Flex>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={6}>
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={2}>
            {selectedOption.label}
          </Text>
          <Box height="400px" borderRadius="md" overflow="hidden" shadow="md" bg="gray.700">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </Box>
        </Box>
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={2}>
            {selectedQuery ? "Query Details" : `${selectedOption.label} Summary`}
            {compareEndpointData && ` (vs ${compareEndpointData.endpoint})`}
          </Text>
          <Card shadow="md" borderWidth="1px" bg="gray.700" p={4} position="relative">
            {selectedQuery && (
              <IconButton
                aria-label="Back to summary"
                icon={<CloseIcon />}
                size="sm"
                position="absolute"
                top={2}
                right={2}
                onClick={() => setSelectedQuery(null)}
                variant="ghost"
              />
            )}
            {renderSummary()}
          </Card>
        </Box>
      </Grid>

      {topQueries.length > 0 && (
        <Box mt={6}>
          <Text fontSize="md" fontWeight="semibold" mb={2}>Top Queries</Text>
          <Box shadow="md" borderWidth="1px" borderRadius="md" overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Query</Th>
                  <Th>Category</Th>
                  <Th isNumeric>Count</Th>
                </Tr>
              </Thead>
              <Tbody>
                {topQueries.map((query, index) => (
                  <Tr
                    key={index}
                    onClick={() => setSelectedQuery(query)}
                    cursor="pointer"
                    _hover={{ bg: "gray.600" }}
                    bg={selectedQuery?.query === query.query ? "gray.600" : "transparent"}
                  >
                    <Td>{query.query || "N/A"}</Td>
                    <Td>{query.category || "N/A"}</Td>
                    <Td isNumeric>{(query.count || 0).toLocaleString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Overview;