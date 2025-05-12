import React from "react";
import {
  Container,
  Flex,
  Box,
  Text,
  Divider,
  VStack,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import type { UserPublic } from "../../client";
import Appearance from "../../components/UserSettings/Appearance";
import ChangePassword from "../../components/UserSettings/ChangePassword";
import DeleteAccount from "../../components/UserSettings/DeleteAccount";
import UserInformation from "../../components/UserSettings/UserInformation";
import ApiStatusManagement from "../../components/UserSettings/ApiStatusManagement";

const sectionsConfig = [
  { title: "Profile", component: UserInformation },
  { title: "Password", component: ChangePassword },
  { title: "Appearance", component: Appearance },
  { title: "API Status", component: ApiStatusManagement },
];

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
});

function UserSettings() {
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);
  const [activeSection, setActiveSection] = React.useState(sectionsConfig[0].title);

  const bgColor = useColorModeValue("gray.50", "gray.800");
  const textColor = useColorModeValue("gray.800", "gray.200");
  const sidebarBg = useColorModeValue("white", "gray.700");
  const activeButtonBg = useColorModeValue("green.100", "green.900");
  const activeButtonColor = useColorModeValue("green.700", "green.200");

  if (!currentUser) {
    return (
      <Container maxW="full" bg={bgColor} py={6}>
        <Text color={textColor}>Loading...</Text>
      </Container>
    );
  }

  const ActiveComponent = sectionsConfig.find(
    (section) => section.title === activeSection
  )?.component;

  return (
    <Container maxW="7xl" bg={bgColor} color={textColor} py={6}>
      <Flex direction="column" gap={4}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Settings
          </Text>
          <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.400")}>
            Customize your account
          </Text>
        </Box>

        <Divider borderColor={useColorModeValue("gray.200", "gray.600")} />

        <Flex gap={6} direction={{ base: "column", md: "row" }}>
          <VStack
            align="start"
            spacing={2}
            w={{ base: "full", md: "200px" }}
            p={4}
            bg={sidebarBg}
            borderRadius="md"
            boxShadow="sm"
          >
            {sectionsConfig.map((section) => (
              <Button
                key={section.title}
                variant="ghost"
                w="full"
                justifyContent="start"
                bg={activeSection === section.title ? activeButtonBg : "transparent"}
                color={activeSection === section.title ? activeButtonColor : textColor}
                _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}
                onClick={() => setActiveSection(section.title)}
              >
                {section.title}
              </Button>
            ))}
          </VStack>

          <Box flex="1" p={4} bg={sidebarBg} borderRadius="md" boxShadow="sm">
            {ActiveComponent && <ActiveComponent />}
          </Box>
        </Flex>
      </Flex>
    </Container>
  );
}

export default UserSettings;