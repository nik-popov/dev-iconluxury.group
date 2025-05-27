import { Box, Flex, Icon, Text, Tooltip } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  FiHome,
  FiUsers,
  FiLayers,
  FiCalendar,
  FiFileText,
  FiMessageSquare,
  FiGlobe,
  FiShield,
  FiHelpCircle,
  FiLogOut,
  FiSearch,
  FiArchive,
  FiEye,
  FiGlobe as FiGoogleSerp,
} from "react-icons/fi";
import type { UserPublic } from "../../client";
import useAuth from "../../hooks/useAuth";

interface SidebarItem {
  title: string;
  icon?: any;
  path?: string;
  subItems?: SidebarItem[];
  action?: () => void;
}

const sidebarStructure: SidebarItem[] = [
  { title: "Dashboard", icon: FiHome, path: "/" },
  { title: "Orders", icon: FiLayers, path: "/orders" },
  { title: "Offers", icon: FiCalendar, path: "/offers" },
  { title: "Customers", icon: FiUsers, path: "/customers" },
  {
    title: "Scraper",
    subItems: [
      { title: "Jobs", path: "/scraping-api/explore", icon: FiSearch },
      { title: "Archive", path: "/scraping-api/explore-assets", icon: FiArchive },
      { title: "Vision", path: "/scraping-api/vision", icon: FiEye },
      { title: "Reasoning", path: "/scraping-api/language-model", icon: FiBrain },
      { title: "Google SERP", path: "/scraping-api/google-serp", icon: FiGoogleSerp },
    ],
  },
  {
    title: "Logs",
    subItems: [
      { title: "Network Logs", path: "/support/network-logs", icon: FiFileText },
      { title: "Email Logs", path: "/support/email", icon: FiMessageSquare },
    ],
  },
  { title: "VPN", icon: FiShield, path: "/support/vpn" },
  { title: "Support", icon: FiHelpCircle, path: "/support" },
  { title: "Sign out", icon: FiLogOut, action: () => {} },
];

interface SidebarItemsProps {
  onClose?: () => void;
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const textColor = "gray.800"; // Matches theme's Text baseStyle
  const disabledColor = "ui.dim"; // Matches theme's muted gray
  const hoverColor = "ui.main"; // Yellow from theme
  const bgActive = "ui.light"; // White background for active item
  const activeTextColor = "gray.800"; // Matches theme's text color
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  const finalSidebarStructure = [...sidebarStructure];
  if (currentUser?.is_superuser && !finalSidebarStructure.some(item => item.title === "Admin")) {
    finalSidebarStructure.splice(finalSidebarStructure.length - 1, 0, { title: "Admin", icon: FiShield, path: "/admin" });
  }

  const renderItems = (items: SidebarItem[]) =>
    items.map(({ icon, title, path, subItems, action }) => {
      return (
        <Box key={title} mb={2}>
          {path ? (
            <Flex
              as={Link}
              to={path}
              w="100%"
              p={2}
              borderRadius="md"
              activeProps={{
                style: {
                  background: bgActive,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  color: activeTextColor,
                },
              }}
              color={textColor}
              _hover={{ color: hoverColor, bg: "gray.50" }}
              onClick={onClose}
              align="center"
            >
              {icon && <Icon as={icon} mr={2} />}
              <Text fontSize="sm" fontWeight="medium">{title}</Text>
            </Flex>
          ) : action ? (
            <Flex
              w="100%"
              p={2}
              borderRadius="md"
              color={textColor}
              _hover={{ color: hoverColor, bg: "gray.50" }}
              onClick={() => {
                if (title === "Sign out") logout();
                onClose?.();
              }}
              cursor="pointer"
              align="center"
            >
              {icon && <Icon as={icon} mr={2} />}
              <Text fontSize="sm" fontWeight="medium">{title}</Text>
            </Flex>
          ) : (
            <Box>
              <Text p={2} fontSize="sm" fontWeight="bold" color={textColor}>{title}</Text>
              <Box bg="ui.light" borderRadius="md" boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)" p={2}>
                {subItems && renderItems(subItems)}
              </Box>
            </Box>
          )}
        </Box>
      );
    });

  return (
    <Box>
      <Box>{renderItems(finalSidebarStructure)}</Box>
      {currentUser && (
        <Flex
          as={Link}
          to="/settings"
          w="100%"
          p={2}
          mt={4}
          borderRadius="md"
          bg="ui.light"
          boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)"
          color={textColor}
          _hover={{ color: hoverColor, bg: "gray.50" }}
          onClick={onClose}
          direction="column"
        >
          <Text fontSize="sm" fontWeight="medium">{currentUser.full_name || "User"}</Text>
          <Text fontSize="xs" color="ui.dim">{currentUser.email || "email@example.com"}</Text>
        </Flex>
      )}
    </Box>
  );
};

export default SidebarItems;