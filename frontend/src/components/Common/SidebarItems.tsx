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
  { title: "Home", icon: FiHome, path: "/" },
  { title:  "S3", icon: FiCloud, path: "/scraping-api/explore-assets" },
  {
    title: "Scraping",
    subItems: [
      { title: "Jobs", path: "/scraping-api/explore" },
      { title: "Proxies", path: "/scraping-api/search-proxies" },
      { title: "Vision", path: "/scraping-api/vision" },
      { title: "Reasoning", path: "/scraping-api/language-model" },

    ],
    icon: FiGlobe,
  },
  { title: "Remote Desktop", icon: FiTool, path: "/support/remote-desktop" },
  { title: "VPN", icon: FiShield, path: "/support/vpn" },
  // { title: "Sonos", icon: FiMusic, path: "/sonos" },
  { title: "Network Logs", icon: FiFileText, path: "/support/network-logs" },
  { title: "NAS", icon: FiDatabase, path: "/support/backup-recovery" },
  { title: "Email Logs", icon: FiMessageSquare, path: "/support/email" },
];

interface SidebarItemsProps {
  onClose?: () => void;
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient();
  const textColor = "gray.800"  // Dark text for enabled items
  const disabledColor = "gray.300"  // Darker gray for disabled items (was gray.400)
  const hoverColor = "green.600"  // Green accent for hover
  const bgActive = "green.100"  // Light green for active state
  const activeTextColor = "green.800"  // Darker green for active text
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  const finalSidebarStructure = [...sidebarStructure];
  if (currentUser?.is_superuser && !finalSidebarStructure.some(item => item.title === "Admin")) {
    finalSidebarStructure.push({ title: "Admin", icon: FiUsers, path: "/admin" });
  }

  const isEnabled = (title: string) =>
    ["Dashboard", "Scraping","Storage", "Admin"].includes(title) ||
    (title === "Jobs" && 
      finalSidebarStructure.some(item => 
        item.title === "Scraping" && 
        item.subItems?.some(sub => sub.title === "Jobs")
      )) ||
    (title === "Proxies" && 
      finalSidebarStructure.some(item => 
        item.title === "Scraping" && 
        item.subItems?.some(sub => sub.title === "Proxies")
      ));

  const renderItems = (items: SidebarItem[]) =>
    items.map(({ icon, title, path, subItems }) => {
      const enabled = isEnabled(title);
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