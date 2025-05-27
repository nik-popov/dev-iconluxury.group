import { Box, Flex, Icon, Text, useColorModeValue, Tooltip } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  FiHome,
  FiCreditCard,
  FiList,
  FiCreditCard as FiCards,
  FiDollarSign,
  FiPieChart,
  FiSettings,
  FiHelpCircle,
} from "react-icons/fi";
import type { UserPublic } from "../../client";

interface SidebarItem {
  title: string;
  icon?: any;
  path?: string;
}

const sidebarStructure: SidebarItem[] = [
  { title: "Dashboard", icon: FiHome, path: "/" },
  { title: "Payment", icon: FiDollarSign, path: "/payment" },
  { title: "Transaction", icon: FiList, path: "/transaction" },
  { title: "Cards", icon: FiCards, path: "/cards" },
  { title: "Capital", icon: FiPieChart, path: "/capital" },
  { title: "Vaults", icon: FiCreditCard, path: "/vaults" },
  { title: "Reports", icon: FiPieChart, path: "/reports" },
  { title: "Account Management", icon: FiSettings, path: "/settings" },
  { title: "Settings", icon: FiSettings, path: "/settings" },
  { title: "Help", icon: FiHelpCircle, path: "/help" },
];

interface SidebarItemsProps {
  onClose?: () => void;
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient();
  const textColor = "gray.600";
  const hoverColor = "blue.500";
  const bgActive = "blue.50";
  const activeTextColor = "blue.500";
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  const finalSidebarStructure = [...sidebarStructure];

  const renderItems = (items: SidebarItem[]) =>
    items.map(({ icon, title, path }) => (
      <Box key={title}>
        {path ? (
          <Flex
            as={Link}
            to={path}
            w="100%"
            p={2}
            mb={1}
            borderRadius="md"
            activeProps={{
              style: { background: bgActive, color: activeTextColor },
            }}
            color={textColor}
            _hover={{ color: hoverColor, bg: "gray.100" }}
            onClick={onClose}
          >
            {icon && <Icon as={icon} mr={3} boxSize={5} />}
            <Text fontSize="sm">{title}</Text>
          </Flex>
        ) : null}
      </Box>
    ));

  return (
    <Box>
      <Box mb={4}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>GENERAL</Text>
        {renderItems(finalSidebarStructure.slice(0, 4))}
      </Box>
      <Box mb={4}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>SUPPORT</Text>
        {renderItems(finalSidebarStructure.slice(4, 7))}
      </Box>
      <Box>
        {renderItems(finalSidebarStructure.slice(7))}
        <Flex p={2} align="center">
          <Text fontSize="sm" color="green.500">Earn €150</Text>
        </Flex>
      </Box>
      <Box mt={4} p={2} borderTopWidth="1px" borderColor="gray.200">
        <Flex align="center">
          <Box boxSize={8} bg="gray.200" borderRadius="full" mr={2} />
          <Box>
            <Text fontSize="sm" fontWeight="medium">{currentUser?.full_name || "Young Alaska"}</Text>
            <Text fontSize="xs" color="gray.500">{currentUser?.email || "alskayng@gmail.com"}</Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

export default SidebarItems;