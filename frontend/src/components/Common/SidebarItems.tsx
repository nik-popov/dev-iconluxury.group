import { Box, Flex, Icon, Text, Tooltip, Avatar } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
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
  { title: "Offers", icon: FiCalendar, path: "/offers" },
  { title: "Orders", icon: FiLayers, path: "/orders" },
  { title: "Customers", icon: FiUsers, path: "/customers" },
  { title: "Archive", path: "/explore", icon: FiArchive },
  {
    title: "Scraper",
    subItems: [
      { title: "Jobs", path: "/scraping-api/explore", icon: FiSearch },
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
  { title: "Support", icon: FiHelpCircle, path: "/support" },
  { title: "VPN", icon: FiShield, path: "/vpn" },
  { title: "Sign out", icon: FiLogOut, action: () => {} },
];

interface SidebarItemsProps {
  onClose?: () => void;
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const location = useLocation();
  const textColor = "gray.800";
  const disabledColor = "ui.dim";
  const hoverColor = "ui.main";
  const bgActive = "ui.light";
  const activeTextColor = "gray.800";
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  const avatarOptions = [
    "https://i.pravatar.cc/150",
  ];
  const hardcodedAvatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];

  const finalSidebarStructure = [...sidebarStructure];
  if (currentUser?.is_superuser && !finalSidebarStructure.some(item => item.title === "Admin")) {
    finalSidebarStructure.splice(finalSidebarStructure.length - 1, 0, { title: "Admin", icon: FiShield, path: "/admin" });
  }

  const isEnabled = (title: string) => {
    if (["Dashboard", "Orders", "Offers", "Customers", "Support", "Sign out"].includes(title)) {
      return true;
    }
    if (["Scraper", "Jobs", "Archive", "Google SERP", "Logs", "Network Logs", "Email Logs", "VPN", "Admin"].includes(title)) {
      return currentUser?.is_superuser || false;
    }
    return true;
  };

  const renderItems = (items: SidebarItem[]) =>
    items.map(({ icon, title, path, subItems, action }) => {
      const enabled = isEnabled(title);
      if (!enabled) {
        return null;
      }
      const showAdminLabel = ["Archive","VPN", "Admin"].includes(title);
      const isActive = path === location.pathname || (path === "/" && location.pathname === "");
      return (
        <Box key={title} mb={2}>
          {path ? (
            <Flex
              as={Link}
              to={path}
              w="100%"
              p={2}
              borderRadius="md"
              style={isActive ? {
                background: bgActive,
                boxShadow: "card",
                color: activeTextColor,
                borderRadius: "md",
              } : {}}
              color={textColor}
              _hover={{ color: hoverColor }}
              onClick={onClose}
              align="center"
              justify="space-between"
            >
              <Flex align="center">
                {icon && <Icon as={icon} mr={2} color={isActive ? activeTextColor : textColor} />}
                <Text>{title}</Text>
              </Flex>
              {showAdminLabel && (
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  bg="gray.200"
                  color={textColor}
                  px={2}
                  py={0.5}
                  borderRadius="full"
                >
                  Admin
                </Text>
              )}
            </Flex>
          ) : action ? (
            <Flex
              w="100%"
              p={2}
              borderRadius="md"
              color={textColor}
              _hover={{ color: hoverColor }}
              onClick={() => {
                if (title === "Sign out") logout();
                onClose?.();
              }}
              cursor="pointer"
              align="center"
            >
              {icon && <Icon as={icon} mr={2} />}
              <Text>{title}</Text>
            </Flex>
          ) : (
            <Box>
              <Text p={2} fontWeight="bold">{title}</Text>
              <Box>{subItems && renderItems(subItems)}</Box>
            </Box>
          )}
        </Box>
      );
    });

  return (
    <Box className="sidebar">
      <Box>{renderItems(finalSidebarStructure)}</Box>
      {currentUser && (
        <Flex
          as={Link}
          to="/settings"
          w="100%"
          p={2}
          mt={4}
          borderRadius="md"
          bg="gray.100"
          boxShadow="card"
          color={textColor}
          border="2px solid"
          borderColor="transparent"
          _hover={{
            color: hoverColor,
            bg: "gray.50",
            borderColor: "ui.main",
          }}
          transition="all 0.2s ease"
          onClick={onClose}
          align="center"
        >
          <Avatar
            size="sm"
            name={currentUser.full_name || "User"}
            src={hardcodedAvatar}
            mr={2}
            filter="grayscale(100%)"
            border="2px solid"
            borderColor="transparent"
            _hover={{
              filter: "grayscale(0)",
              borderColor: "ui.main",
            }}
            transition="all 0.2s ease"
          />
          <Box flex="1">
            <Text fontWeight="medium">{currentUser.full_name || "User"}</Text>
            <Text fontSize="xs" color="ui.dim" isTruncated={false} whiteSpace="normal">
              {currentUser.email || "email@example.com"}
            </Text>
          </Box>
        </Flex>
      )}
    </Box>
  );
};

export default SidebarItems;