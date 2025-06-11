import React, { useState, useEffect, useRef } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Box,
  Container,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Divider,
  Badge,
  Input,
  HStack,
  Flex,
  Button,
} from "@chakra-ui/react";
// `Outlet` might be needed in a layout route file, not necessarily here unless this itself is a layout.
import { createFileRoute, useNavigate } from "@tanstack/react-router"; 
import { FiUpload } from "react-icons/fi"; // Correctly imported

// NOTE: The "invariant failed" error is often related to the router setup.
// To resolve it, please ensure the following:
// 1. TanStack Router CLI (`@tanstack/router-cli`) has been run, and the `routeTree.gen.ts`
//    file (or your equivalent generated route tree) is up-to-date and correctly imported
//    when creating the router instance.
// 2. The main application entry point (e.g., `main.tsx` or `App.tsx`) correctly sets up
//    `QueryClientProvider` (from React Query) and `RouterProvider` (from TanStack Router)
//    at the root of your application. For example:
//    ```tsx
//    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
//    import { RouterProvider, createRouter } from '@tanstack/react-router';
//    import { routeTree } from './routeTree.gen'; // Assuming CLI generated this
//
//    const queryClient = new QueryClient();
//    const router = createRouter({ routeTree, context: { queryClient } }); // Pass queryClient in context if using it in loaders
//
//    declare module '@tanstack/react-router' {
//      interface Register { router: typeof router }
//    }
//
//    ReactDOM.createRoot(document.getElementById('root')!).render(
//      <React.StrictMode>
//        <QueryClientProvider client={queryClient}>
//          <RouterProvider router={router} />
//        </QueryClientProvider>
//      </React.StrictMode>
//    );
//    ```
// 3. If this route `/_layout/offers` implies a parent layout route (e.g., a file named `_layout.tsx`
//    in the `routes` directory), that parent layout route file must:
//    a. Exist and be correctly defined (e.g., `export const Route = createFileRoute('/_layout/offers')({ component: MyLayoutComponent });`).
//    b. Its component (`MyLayoutComponent` in the example) *must* render an `<Outlet />` component
//       (imported from `@tanstack/react-router`) where child routes like this `OffersPage` will be rendered.
//       Example for `routes/_layout.tsx`:
//       ```tsx
//       import { createFileRoute, Outlet } from '@tanstack/react-router';
//       function MyLayoutComponent() {
//         return (
//           <div>
//             <header>My App Layout</header>
//             <main>
//               <Outlet /> {/* Child routes render here */}
//             </main>
//           </div>
//         );
//       }
//       export const Route = createFileRoute('/_layout/offers')({ component: MyLayoutComponent });
//       ```
// 4. Hooks like `useNavigate()` must be called from components rendered *within* the `RouterProvider`'s context.
//    If `OffersPage` is somehow rendered outside this context, these hooks will fail.

interface OfferSummary {
  id: number;
  fileName?: string;
  fileLocationUrl: string;
  userEmail?: string;
  createTime?: string;
  recordCount: number;
  nikOfferCount: number;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  isTrial: boolean;
  isDeactivated: boolean;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token");
};

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = getAuthToken();
  const response = await fetch("https://api.iconluxury.group/api/v1/subscription-status/serp", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      const error = new Error("Unauthorized: Please log in again.");
      // You could attach status to error if needed: (error as any).status = response.status;
      throw error;
    }
    throw new Error(`Failed to fetch subscription status: ${response.status}`);
  }
  return response.json();
}

async function fetchOffers(page: number): Promise<OfferSummary[]> {
  const token = getAuthToken();
  const response = await fetch(
    `https://backend-dev.iconluxury.group/api/luxurymarket/supplier/offers?page=${page}&page_size=10`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch offers: ${response.status}`);
  }
  const data = await response.json();
  // Ensure the function always returns an array, even if API sends unexpected payload
  return Array.isArray(data) ? data : [];
}

function OffersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [allOffers, setAllOffers] = useState<OfferSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: subscriptionStatus, isLoading: isSubLoading, error: subErrorObj } = useQuery({
    queryKey: ["subscriptionStatus", "supplierOffers"], // More specific query key
    queryFn: fetchSubscriptionStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Unauthorized")) return false;
      return failureCount < 3;
    },
  });
  
  const subError = subErrorObj as Error | null; // Type assertion for error object

  const { data: offersData, isLoading: offersLoading, isFetching } = useQuery({
    queryKey: ["offers", page],
    queryFn: () => fetchOffers(page),
    // Enable only if subscription is active/trial, there's more data, and no subscription error
    enabled: (!!subscriptionStatus?.hasSubscription || !!subscriptionStatus?.isTrial) && hasMore && !subError,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const offers = offersData || []; // Default to empty array if offersData is undefined

  // Append new offers when `offersData` (from the current page query) changes
  useEffect(() => {
    if (offersData && offersData.length > 0) {
      setAllOffers((prevOffers) => {
        const combinedOffers = [...prevOffers, ...offersData];
        // Deduplicate offers by ID, keeping the latest occurrence
        return Array.from(new Map(combinedOffers.map((offer) => [offer.id, offer])).values());
      });
      if (offersData.length < 10) { // 10 is the page_size
        setHasMore(false);
      }
    } else if (offersData && offersData.length === 0 && page > 1) {
      // Current page fetch returned no new items (and it's not the first page)
      setHasMore(false);
    }
  }, [offersData, page]);

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    // Don't set up observer if fetching, initial loading, no more items, or ref not available
    if (isFetching || offersLoading || !hasMore || !loadMoreRef.current) {
      return;
    }

    const observedElement = loadMoreRef.current; // Capture the DOM element

    const observer = new IntersectionObserver(
      (entries) => {
        // Trigger next page fetch if element is intersecting and not already fetching
        if (entries[0].isIntersecting && !isFetching) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      { threshold: 0.1, rootMargin: "200px" } // Load 200px before element is visible
    );

    observer.observe(observedElement);

    return () => {
      observer.unobserve(observedElement); // Clean up by unobserving the captured element
    };
  }, [isFetching, offersLoading, hasMore]); // Rerun if these states change

  const filteredOffers = searchQuery
    ? allOffers.filter((offer) =>
        offer.fileName // Check if fileName is defined
          ? offer.fileName.toLowerCase().includes(searchQuery.toLowerCase())
          : false // Offers without a fileName don't match if searching
      )
    : allOffers;

  const getStatusColor = (recordCount: number) => {
    return recordCount > 0 ? "green" : "yellow";
  };

  const handleRowClick = (offerId: number) => {
    navigate({
      to: "/supplier/offer/$offerId",
      params: { offerId: offerId.toString() }, // Path params must be strings
    });
  };

  if (isSubLoading) {
    return (
      <Container maxW="full" bg="white" color="gray.800" p={4} textAlign="center">
        <Text>Loading your data...</Text>
      </Container>
    );
  }

  if (subError) {
    return (
      <Container maxW="full" bg="white" color="gray.800" p={4} textAlign="center">
        <Text color="red.500" mb={4}>
          {subError.message === "Unauthorized: Please log in again."
            ? "Session expired. Please log in again."
            : `Error loading subscription status: ${subError.message}. Please try again later.`}
        </Text>
        {subError.message.includes("Unauthorized") && (
          <Button colorScheme="blue" onClick={() => navigate({ to: "/login" })}>
            Log In
          </Button>
        )}
      </Container>
    );
  }
  
  const currentSubscriptionStatus = subscriptionStatus || {
    hasSubscription: false, isTrial: false, isDeactivated: false,
  };

  const isLocked = !currentSubscriptionStatus.hasSubscription && !currentSubscriptionStatus.isTrial;
  // User is considered fully deactivated if their account is marked as deactivated AND they don't have an active subscription or trial.
  const isEffectivelyDeactivated = currentSubscriptionStatus.isDeactivated && isLocked;

  // The comment `// Modify the header Flex component inside the SupplierOffers function`
  // might be outdated or for a different context. The header Flex below is functional.
  // Small responsive adjustments have been made.
  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={{ base: 2, md: 4 }}>
        <Flex 
          direction={{ base: "column", sm: "row" }}
          align="center" 
          justify="space-between" 
          py={{ base: 4, md: 6 }}
          px={{ base: 2, md: 0 }}
          flexWrap="wrap"
          gap={4}
        >
          <Box textAlign={{ base: "center", sm: "left" }} flex="1" minW={{ base: "auto", sm: "300px" }}>
            <Text fontSize="xl" fontWeight="bold" color="gray.800">Supplier File Explorer</Text>
            <Text fontSize="sm" color="gray.600">View and manage supplier offers</Text>
          </Box>
          <HStack 
            spacing={3} 
            justifyContent={{ base: "center", sm: "flex-end"}} 
            width={{ base: "100%", sm: "auto" }}
            mt={{ base: 4, sm: 0 }}
          >
            <Button
              leftIcon={<FiUpload />}
              colorScheme="green"
              size="sm"
              onClick={() => navigate({ to: "/submit-form/offer" })}
            >
              Upload Offer
            </Button>
          </HStack>
        </Flex>

      <Divider my={3} borderColor="gray.200" />

      {isLocked && !isEffectivelyDeactivated ? ( // Show if locked but not due to deactivation (e.g. new user, expired)
        <Box p={4} bg="yellow.50" borderRadius="md" textAlign="center">
          <Text color="orange.700" fontWeight="medium">Access restricted. Please contact support.</Text>
    
        </Box>
      ) : isEffectivelyDeactivated ? (
        <Flex 
          direction={{ base: "column", sm: "row" }}
          justify="space-between" 
          align="center" 
          w="full" p={4} 
          bg="red.50" 
          borderRadius="md"
          gap={3}
        >
          <Text color="red.700" fontWeight="medium" textAlign={{ base: "center", sm: "left" }}>
            Your tools have been deactivated.
          </Text>
          <Button 
            colorScheme="red" 
            size="sm"
            onClick={() => navigate({ to: "/proxies/pricing" })} /* Adjust nav target */
          >
            Reactivate Now
          </Button>
        </Flex>
      ) : (
        <Box>
          <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
            <Input
              placeholder="Search Offers by File Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              w={{ base: "100%", md: "300px" }}
              borderColor="green.300"
              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
              _hover={{ borderColor: "green.400" }}
              bg="white"
              color="gray.800"
              _placeholder={{ color: "gray.500" }}
              borderRadius="md"
              size="sm"
            />
          </Flex>
          <Text fontSize="md" fontWeight="bold" color="gray.800" mb={2}>
            All Offers
          </Text>
          <TableContainer
            p={3}
            shadow="sm"
            borderWidth="1px"
            borderRadius="md"
            bg="white"
            borderColor="gray.200"
            overflowX="auto" // For horizontal scroll on small screens
          >
            <Table variant="simple" size={{ base: "xs", md: "sm" }}> {/* Responsive table size */}
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>File Name</Th>
                  <Th>User</Th>
                  <Th>Created</Th>
                  <Th>Records</Th>
                  <Th>NIK Offers</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(offersLoading || (isFetching && page === 1 && allOffers.length === 0)) ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={10}>
                      <Text fontSize="sm" color="gray.600">Loading offers...</Text>
                    </Td>
                  </Tr>
                ) : filteredOffers.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={10}>
                      <Text fontSize="sm" color="gray.600">
                        {searchQuery 
                          ? `No offers found matching "${searchQuery}".` 
                          : allOffers.length > 0 && searchQuery === "" // Search cleared but still no match (unlikely with current filter logic)
                            ? "No offers match your current filter." // This case might be rare
                            : "No offers available at the moment."} 
                      </Text>
                    </Td>
                  </Tr>
                ) : (
                  filteredOffers.map((offer) => (
                    <Tr
                      key={offer.id}
                      onClick={() => handleRowClick(offer.id)}
                      cursor="pointer"
                      _hover={{ bg: "gray.50" }}
                    >
                      <Td isNumeric>{offer.id}</Td>
                      <Td maxW="200px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={offer.fileName}>
                        {offer.fileName || "N/A"}
                      </Td>
                      <Td maxW="150px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={offer.userEmail}>
                        {offer.userEmail || "Unknown"}
                      </Td>
                      <Td>
                        {offer.createTime ? new Date(offer.createTime).toLocaleDateString() : "N/A"}
                      </Td>
                      <Td isNumeric>{offer.recordCount}</Td>
                      <Td isNumeric>{offer.nikOfferCount}</Td>
                      <Td>
                        <Badge variant="subtle" colorScheme={getStatusColor(offer.recordCount)} size="sm">
                          {offer.recordCount > 0 ? "Active" : "Pending"}
                        </Badge>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
          
          {hasMore && ( // Only show loading indicator / trigger if there are more items
            <Box ref={loadMoreRef} h="60px" display="flex" alignItems="center" justifyContent="center">
              {isFetching && <Text fontSize="sm" color="gray.600">Loading more offers...</Text>}
            </Box>
          )}
          {!hasMore && allOffers.length > 0 && ( // Show "no more" message only if some offers were loaded
             <Box h="60px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="sm" color="gray.600">You've reached the end of the list.</Text>
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
}

export const Route = createFileRoute("/_layout/offers")({
  component: OffersPage,
  // Optional: Add loaders for server-side data fetching or pre-fetching
  // loader: async ({ context }) => { /* context.queryClient can be used here if passed to createRouter */ },
  // Optional: Add a component for handling errors specific to this route
  // errorComponent: ({ error }) => <ErrorDisplay error={error} />, 
});

// Default export is not strictly necessary for TanStack Router's file-based routing
// but can be useful for other import scenarios or testing.
export default OffersPage;
