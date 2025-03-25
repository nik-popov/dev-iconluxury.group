// src/pages/GoogleSerpPage.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Container, Flex, Text, Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import OverviewGSerp from "../../../components/OverviewGSerp";
import LogsGSerp from "../../../components/LogsGSerp"; 
import PlaygroundGSerp from "../../../components/PlaygroundGSerp";
import WhitelistGSerp from "../../../components/WhitelistGSerp";
import OptimalReferencesTable from "../../../components/OptimalReferencesTable";
const GoogleSerpPage = () => {
// src/pages/GoogleSerpPage.tsx


// Inside GoogleSerpPage component
const tabsConfig = [
  // { title: "Overview", component: () => <OverviewGSerp /> },
  { title: "Logs", component: () => <LogsGSerp /> },
  { title: "Playground", component: () => <PlaygroundGSerp /> },
  { title: "Whitelist", component: () => <WhitelistGSerp /> },
  { title: "References", component: () => <OptimalReferencesTable /> },
];

  return (
    <Container maxW="full">
      <Flex align="center" justify="space-between" py={6}>
        <Text fontSize="xl" fontWeight="bold">Google SERP</Text>
        <Text fontSize="sm">Manage your Google SERP settings and endpoints.</Text>
      </Flex>
      <Tabs variant="enclosed">
        <TabList>
          {tabsConfig.map((tab, index) => (
            <Tab key={index}>{tab.title}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {tabsConfig.map((tab, index) => (
            <TabPanel key={index}>{tab.component()}</TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export const Route = createFileRoute("/_layout/scraping-api/google-serp")({
  component: GoogleSerpPage,
});

export default GoogleSerpPage;