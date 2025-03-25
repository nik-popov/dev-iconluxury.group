import React from "react";
import {
  Container,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Box,
  Divider,
} from "@chakra-ui/react";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import type { UserPublic } from "../../client";
import Appearance from "../../components/UserSettings/Appearance";
import ChangePassword from "../../components/UserSettings/ChangePassword";
import DeleteAccount from "../../components/UserSettings/DeleteAccount";
import UserInformation from "../../components/UserSettings/UserInformation";
import ApiStatusManagement from "../../components/UserSettings/ApiStatusManagement";

const tabsConfig = [
  { title: "My profile", component: UserInformation },
  { title: "Password", component: ChangePassword },
  { title: "Appearance", component: Appearance },
  { title: "ApI Status Management", component: () => <ApiStatusManagement /> },
  { title: "Close Account", component: DeleteAccount },
];

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
});

function UserSettings() {
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  if (!currentUser) {
    return (
      <Container maxW="full" bg="gray.50" py={6}>
        <Text color="gray.600">Loading user data...</Text>
      </Container>
    );
  }

  const finalTabs = currentUser?.is_superuser
    ? tabsConfig // All tabs for superusers
    : tabsConfig; // All tabs for non-superusers (or adjust as needed)

  return (
    <Container maxW="full" bg="gray.50" color="gray.800">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">
            Settings
          </Text>
          <Text fontSize="sm" color="gray.600">
            Manage system & user settings
          </Text>
        </Box>
      </Flex>

      <Divider my={4} borderColor="gray.200" />

      <Tabs variant="enclosed" colorScheme="green">
        <TabList borderBottom="2px solid" borderColor="green.200">
          {finalTabs.map((tab, index) => (
            <Tab
              key={index}
              _selected={{ bg: "green.100", color: "green.700", borderColor: "green.500" }}
              color="gray.600"
              _hover={{ bg: "gray.100" }}
            >
              {tab.title}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {finalTabs.map((tab, index) => (
            <TabPanel key={index} bg="gray.50" p={4}>
              {React.createElement(tab.component)}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Container>
  );
}

export default UserSettings;