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
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { FiLogOut, FiMenu } from "react-icons/fi"

import Logo from "/assets/images/luxury-market-logo-svg.svg"
import type { UserPublic } from "../../client"
import useAuth from "../../hooks/useAuth"
import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  const queryClient = useQueryClient()
  const bgColor = "gray.900"  // Changed to fixed light background
  const textColor = "gray.100"  // Dark text for visibility
  const secBgColor = "gray.700"  // Light gray secondary background
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { logout } = useAuth()

  const handleLogout = async () => {
    logout()
  }
  
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
        color="#FFD700"  // Green accent
        icon={<FiMenu />}
      />
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="250px">
          <DrawerCloseButton color="gray.800" />  // Dark close button
          <DrawerBody py={8} bg="white">  // Light background
            <Flex flexDir="column" justify="space-between" h="100%">
              <Box>
                <Link href="https://dashboard.iconluxury.group">
                  <Image src={Logo} alt="Logo" p={6} />
                </Link>
                <SidebarItems onClose={onClose} />
                <Flex
                  as="button"
                  onClick={handleLogout}
                  p={2}
                  color="#FFD700"  // Green accent for logout
                  fontWeight="bold"
                  alignItems="center"
                >
                  <FiLogOut />
                  <Text color={{textColor}} ml={2}>Sign out</Text>
                </Flex>
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
      >
        <Flex
          flexDir="column"
          justify="space-between"
          bg={secBgColor}
          p={4}
          borderRadius={12}
          w="250px"
        >
          <Box>
            <Link href="https://dashboard.iconluxury.group">
              <Image src={Logo} alt="Logo" w="180px" maxW="2xs" p={6} />
            </Link>
            <SidebarItems />
          </Box>
          <Box>
            {currentUser?.email && (
              <Text color="gray.100" noOfLines={2} fontSize="sm" p={2} maxW="180px">
                Logged in as: {currentUser.email}
              </Text>
            )}
          </Box>
        </Flex>
      </Box>
    </>
  )
}

export default Sidebar
