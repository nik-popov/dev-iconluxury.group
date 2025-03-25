import { Box, Heading, Text, VStack, HStack, Switch, Badge } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// Define the shape of API status settings
type ApiStatusSettings = {
  isActive: boolean;
  isLimited: boolean;
  isDeactivated: boolean;
};

// Define API services
const API_SERVICES = ["service-distro-image"] as const;
type ApiServiceType = (typeof API_SERVICES)[number];

const STORAGE_KEY = "apiStatusSettings"; // Key for localStorage

const ApiStatusManagement = () => {
  const queryClient = useQueryClient();

  // Load API status settings with React Query
  const { data: apiStatusSettings, refetch } = useQuery({
    queryKey: ["apiStatusSettings"],
    queryFn: () => {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      return storedSettings ? JSON.parse(storedSettings) : {};
    },
    staleTime: Infinity,
  });

  // Store API status settings locally for UI updates
  const [settings, setSettings] = useState<Record<ApiServiceType, ApiStatusSettings>>(() =>
    API_SERVICES.reduce((acc, service) => {
      acc[service] = apiStatusSettings?.[service] || {
        isActive: true,
        isLimited: false,
        isDeactivated: false,
      };
      return acc;
    }, {} as Record<ApiServiceType, ApiStatusSettings>)
  );

  // Sync React Query Data into State
  useEffect(() => {
    setSettings((prevSettings) =>
      API_SERVICES.reduce((acc, service) => {
        acc[service] = apiStatusSettings?.[service] || prevSettings[service];
        return acc;
      }, {} as Record<ApiServiceType, ApiStatusSettings>)
    );
  }, [apiStatusSettings]);

  // Update settings locally and sync with localStorage & React Query
  const updateSettings = (service: ApiServiceType, newSettings: ApiStatusSettings) => {
    const updatedSettings = { ...apiStatusSettings, [service]: newSettings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
    queryClient.setQueryData(["apiStatusSettings"], updatedSettings);
    refetch(); // Ensure UI updates reflect instantly
  };

  // Determine status badge properties
  const getStatusBadge = (service: ApiServiceType) => {
    const { isActive, isLimited, isDeactivated } = settings[service];
    if (isDeactivated) return { text: "Deactivated", color: "gray" };
    if (isLimited) return { text: "Limited", color: "yellow" };
    if (isActive) return { text: "Active", color: "green" };
    return { text: "Unknown", color: "red" };
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={5} w="100%">
      <VStack align="stretch" spacing={6}>
        {API_SERVICES.map((service) => {
          const status = getStatusBadge(service);
          return (
            <Box key={service} p={4} borderWidth="1px" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Heading size="sm">{service}</Heading>
                <Badge colorScheme={status.color}>{status.text}</Badge>
              </HStack>
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Text fontWeight="bold">Active</Text>
                  <Switch
                    isChecked={settings[service].isActive}
                    onChange={() =>
                      updateSettings(service, {
                        ...settings[service],
                        isActive: !settings[service].isActive,
                        isDeactivated: false, // Reset deactivated if active toggled on
                      })
                    }
                  />
                </HStack>
                <HStack justify="space-between">
                  <Text fontWeight="bold">Limited Mode</Text>
                  <Switch
                    isChecked={settings[service].isLimited}
                    onChange={() =>
                      updateSettings(service, {
                        ...settings[service],
                        isLimited: !settings[service].isLimited,
                        isDeactivated: false, // Reset deactivated if limited toggled on
                      })
                    }
                  />
                </HStack>
                <HStack justify="space-between">
                  <Text fontWeight="bold">Deactivated</Text>
                  <Switch
                    isChecked={settings[service].isDeactivated}
                    onChange={() =>
                      updateSettings(service, {
                        ...settings[service],
                        isDeactivated: !settings[service].isDeactivated,
                        isActive: false, // Reset active if deactivated toggled on
                        isLimited: false, // Reset limited if deactivated toggled on
                      })
                    }
                  />
                </HStack>
              </VStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};

export default ApiStatusManagement;