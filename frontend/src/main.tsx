import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import { StrictMode } from "react"; // This is fine
import React from "react"; // Add this import
import { OpenAPI } from "./client";
import theme from "./theme";
import "./styles/global.css";

OpenAPI.BASE = "https://api.iconluxury.today";
OpenAPI.TOKEN = async () => localStorage.getItem("access_token") || "";

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ChakraProvider>
  </StrictMode>
);