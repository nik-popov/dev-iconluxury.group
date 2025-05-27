import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  IconButton,
  Image,
  Link,
  Text,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { FiMenu } from "react-icons/fi";
import Logo from "/assets/images/luxury-market-logo-svg.svg";
import type { UserPublic } from "../../client";
import { useDisclosure } from "@chakra-ui/react";
import SidebarItems from "./SidebarItems";

const Sidebar = () => {
  const queryClient = useQueryClient();
  const bgColor = "gray.100"; // Matches theme's .sidebar background
  const textColor = "gray.800"; // Matches theme's text color
  const accentColor = "ui.main"; // Yellow accent from theme
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      {/* Mobile */}
      <IconButton
        onClick={onOpen}
        display={{ base: "flex", md: "none" }}
        aria-label="Open Menu"
        position="absolute"
        fontSize="20px"
        m={4}
        color={accentColor}
        icon={<FiMenu />}
      />
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="250px">
          <DrawerCloseButton color={textColor} />
          <DrawerBody py={8} bg="ui.light" className="sidebar">
            <Flex flexDir="column" h="100%">
              <Box>
                <Link href="https://dashboard.iconluxury.group">
                  <Image src={Logo} alt="Logo" p={6} />
                </Link>
                <SidebarItems onClose={onClose} />
              </Box>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Desktop */}
      <Box
        bg={bgColor}
        p={3}
        h="100%"
        position="sticky"
        top="0"
        display={{ base: "none", md: "flex" }}
        className="sidebar"
      >
        <Flex
          flexDir="column"
          justify="space-between"
          p={4}
          borderRadius="md"
          boxShadow="card"
          w="250px"
        >
          <Box>
            <Link href="https://dashboard.iconluxury.group">
              <Image src={Logo} alt="Logo" w="180px" maxW="2xs" p={6} />
            </Link>
            <SidebarItems />
          </Box>
        </Flex>
      </Box>
    </>
  );
};

export default Sidebar;