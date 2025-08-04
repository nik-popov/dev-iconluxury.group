// src/index.tsx
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import { StrictMode, useEffect } from "react";
import React from "react";
import { OpenAPI } from "./client";
import theme from "./theme";
import "./styles/global.css";
import { useColorMode } from "@chakra-ui/react";

OpenAPI.BASE = "https://api.iconluxury.today";
OpenAPI.TOKEN = async () => localStorage.getItem("access_token") || "";

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

// Create a wrapper component to handle color mode
const AppWrapper: React.FC = () => {
  const { setColorMode } = useColorMode();

  useEffect(() => {
    setColorMode("light");
    localStorage.removeItem("chakra-ui-color-mode"); // Clear stored preference
  }, [setColorMode]);

  return <RouterProvider router={router} />;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <AppWrapper />
      </QueryClientProvider>
    </ChakraProvider>
  </StrictMode>
);