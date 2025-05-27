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
  FiLogOut,
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
      { title: "Jobs", path: "/scraping-api/explore" },
      { title: "Archive", path: "/scraping-api/explore-assets" },
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
  { title: "Sign out", icon: FiLogOut, action: () => {} }, // Placeholder action
];

interface SidebarItemsProps {
  onClose?: () => void;
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const textColor = "gray.100";
  const disabledColor = "gray.300";
  const hoverColor = "#FFD700";
  const bgActive = "yellow.100";
  const activeTextColor = "yellow.800";
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  const finalSidebarStructure = [...sidebarStructure];
  if (currentUser?.is_superuser && !finalSidebarStructure.some(item => item.title === "Admin")) {
    finalSidebarStructure.splice(finalSidebarStructure.length - 1, 0, { title: "Admin", icon: FiUsers, path: "/admin" });
  }

  const isEnabled = (title: string) => {
    if (["Dashboard", "Offers", "Orders", "Customers", "Sign out"].includes(title)) {
      return true;
    }
    if ([
      "Scraper",
      "Jobs",
      "Archive",
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
    return true;
  };

  const renderItems = (items: SidebarItem[]) =>
    items.map(({ icon, title, path, subItems, action }) => {
      const enabled = isEnabled(title);
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
          ) : action ? (
            enabled ? (
              <Flex
                w="100%"
                p={2}
                color={textColor}
                _hover={{ color: hoverColor }}
                onClick={() => {
                  if (title === "Sign out") logout();
                  onClose?.();
                }}
                cursor="pointer"
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