import { Box, Flex, Icon, Text, useColorModeValue, Tooltip } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  FiGlobe,
  FiShield,
  FiFileText,
  FiMessageSquare,
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
  {
    title: "Scraper",
    subItems: [
      { title: "Jobs", path: "/scraping-api/explore", icon: FiSearch },
      { title: "Archive", path: "/scraping-api/explore-assets", icon: FiArchive },
      { title: "Vision", path: "/scraping-api/vision", icon: FiEye },
      { title: "Reasoning", path: "/scraping-api/language-model", icon: FiGlobe },
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
  { title: "VPN", path: "/support/vpn", icon: FiShield },
  { title: "Support", path: "/support", icon: FiHelpCircle },
  { title: "Sign out", icon: FiLogOut, action: () => {} },
];

interface SidebarItemsProps {
  onClose?: () => void;
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const textColor = "gray.600";
  const disabledColor = "gray.300";
  const hoverColor = "gray.800";
  const bgActive = "white";
  const activeTextColor = "gray.800";
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  const finalSidebarStructure = [...sidebarStructure];
  if (currentUser?.is_superuser && !finalSidebarStructure.some(item => item.title === "Admin")) {
    finalSidebarStructure.splice(finalSidebarStructure.length - 1, 0, { title: "Admin", icon: FiShield, path: "/admin" });
  }

  const isEnabled = (title: string) => {
    if (["Sign out"].includes(title)) {
      return true;
    }
    if ([
      "Scraper",
      "Jobs",
      "Archive",
      "Vision",
      "Reasoning",
      "Google SERP",
      "VPN",
      "Network Logs",
      "Email Logs",
      "Admin",
      "Support"
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
        <Box key={title} mb={2}>
          {path ? (
            enabled ? (
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
                    color: activeTextColor 
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
            ) : (
              <Tooltip label="Restricted" placement="right">
                <Flex
                  w="100%"
                  p={2}
                  color={disabledColor}
                  cursor="not-allowed"
                  _hover={{ color: hoverColor }}
                  align="center"
                >
                  {icon && <Icon as={icon} mr={2} color={disabledColor} />}
                  <Text fontSize="sm" fontWeight="medium" color={disabledColor}>{title}</Text>
                </Flex>
              </Tooltip>
            )
          ) : action ? (
            enabled ? (
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
              <Tooltip label="Restricted" placement="right">
                <Flex
                  w="100%"
                  p={2}
                  color={disabledColor}
                  cursor="not-allowed"
                  _hover={{ color: hoverColor }}
                  align="center"
                >
                  {icon && <Icon as={icon} mr={2} color={disabledColor} />}
                  <Text fontSize="sm" fontWeight="medium" color={disabledColor}>{title}</Text>
                </Flex>
              </Tooltip>
            )
          ) : (
            <Box>
              <Flex p={2} color={enabled ? textColor : disabledColor} align="center">
                <Text fontSize="sm" fontWeight="bold">{title}</Text>
              </Flex>
              <Box ml={4} bg="white" borderRadius="md" boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)" p={2}>
                {subItems && renderItems(subItems)}
              </Box>
            </Box>
          )}
        </Box>
      );
    });

  return <Box>{renderItems(finalSidebarStructure)}</Box>;
};

export default SidebarItems;