import { Box, Flex, Icon, Text, useColorModeValue, Tooltip } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  FiHome,
  FiUsers,
  FiLayers,
  FiMessageSquare,
  FiCpu,
  FiMusic,
  FiWifi,
  FiCalendar,
  FiFileText,
  FiSettings,
  FiTool,
  FiDatabase,
  FiGlobe,
  FiShield,
  FiCloud,
  FiMonitor,
  FiHelpCircle,
} from "react-icons/fi";
import type { UserPublic } from "../../client";

interface SidebarItem {
  title: string;
  icon?: any;
  path?: string;
  subItems?: SidebarItem[];
}

const sidebarStructure: SidebarItem[] = [
  { title: "Dashboard", icon: FiHome, path: "/" },
  { title: "Orders", icon: FiLayers, path: "/orders" },
  { title: "Offers", icon: FiCalendar, path: "/offers" },
  { title: "Customer", icon: FiUsers, path: "/customer" },
  {
    title: "Data Warehouse",
    subItems: [
      { title: "Jobs", path: "/scraping-api/explore" },
      { title: "S3", path: "/scraping-api/explore-assets" },
      { title: "Proxies", path: "/scraping-api/search-proxies" },
      { title: "Vision", path: "/scraping-api/vision" },
      { title: "Reasoning", path: "/scraping-api/language-model" },
      { title: "Google SERP", path: "/scraping-api/google-serp" },
    ],
    icon: FiGlobe,
  },
  { title: "Remote Desktop", icon: FiTool, path: "/support/remote-desktop" },
  { title: "VPN", icon: FiShield, path: "/support/vpn" },
  { title: "Network Logs", icon: FiFileText, path: "/support/network-logs" },
  { title: "NAS", icon: FiDatabase, path: "/support/backup-recovery" },
  { title: "Email Logs", icon: FiMessageSquare, path: "/support/email" },
];

interface SidebarItemsProps {
  onClose?: () => void;
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient();
  const textColor = "gray.100";
  const disabledColor = "gray.300";
  const hoverColor = "#FFD700";
  const bgActive = "yellow.100";
  const activeTextColor = "yellow.800";
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  const finalSidebarStructure = [...sidebarStructure];
  if (currentUser?.is_superuser && !finalSidebarStructure.some(item => item.title === "Admin")) {
    finalSidebarStructure.push({ title: "Admin", icon: FiUsers, path: "/admin" });
  }

  const isEnabled = (title: string) => {
    // Dashboard, Orders, Offers, Customer are always enabled
    if (["Dashboard", "Orders", "Offers", "Customer"].includes(title)) {
      return true;
    }
    // Data Warehouse, its sub-items, Remote Desktop, VPN, Network Logs, NAS, Email Logs, and Admin are only enabled for superusers
    if ([
      "Data Warehouse",
      "Jobs",
      "S3",
      "Proxies",
      "Vision",
      "Reasoning",
      "Google SERP",
      "Remote Desktop",
      "VPN",
      "Network Logs",
      "NAS",
      "Email Logs",
      "Admin"
    ].includes(title)) {
      return currentUser?.is_superuser || false;
    }
    // No other items exist in this structure
    return true;
  };

  const renderItems = (items: SidebarItem[]) =>
    items.map(({ icon, title, path, subItems }) => {
      const enabled = isEnabled(title);
      // Skip rendering restricted items for non-superusers
      if (!enabled && !currentUser?.is_superuser) {
        return null;
      }
      return (
        <Box key={title}>
          {path ? (
            enabled ? (
              <Flex
                as={Link}
                to={path}
                w="100%"
                p={2}
                activeProps={{
                  style: { background: bgActive, borderRadius: "12px", color: activeTextColor },
                }}
                color={textColor}
                _hover={{ color: hoverColor }}
                onClick={onClose}
              >
                {icon && <Icon as={icon} alignSelf="center" />}
                <Text color={textColor} ml={2}>{title}</Text>
              </Flex>
            ) : (
              <Tooltip label="Restricted" placement="right">
                <Flex
                  w="100%"
                  p={2}
                  color={disabledColor}
                  cursor="not-allowed"
                  _hover={{ color: hoverColor }}
                >
                  {icon && <Icon as={icon} alignSelf="center" color={disabledColor} />}
                  <Text ml={2} color={disabledColor}>{title}</Text>
                </Flex>
              </Tooltip>
            )
          ) : (
            <Box>
              <Flex p={2} color={enabled ? textColor : disabledColor}>
                {icon && <Icon as={icon} alignSelf="center" color={enabled ? textColor : disabledColor} />}
                <Text ml={2} color={enabled ? textColor : disabledColor}>{title}</Text>
              </Flex>
              <Box ml={6}>{subItems && renderItems(subItems)}</Box>
            </Box>
          )}
        </Box>
      );
    });

  return <Box>{renderItems(finalSidebarStructure)}</Box>;
};

export default SidebarItems;