import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: () => ({
      "html, body": {
        fontFamily: '"42dot Sans", sans-serif',
        lineHeight: "1.7",
        bg: "gray.50", // Light background for the app
        color: "gray.800", // Dark text for readability
        padding: "20px",
      },
      ".sidebar": { // Add a specific style for the sidebar container
        bg: "gray.100", // Slightly darker than the app background for contrast
        minHeight: "100vh", // Full height
        p: 4, // Padding for content
      },
    }),
  },
  colors: {
    ui: {
      main: "#FFD700", // Yellow as primary accent
      secondary: "#FFF8E1", // Light yellow for secondary elements
      success: "#38A169", // Green for success
      danger: "#E53E3E", // Red for errors
      light: "#FFFFFF", // White for backgrounds
      dark: "#1A202C", // Dark background for dark mode
      darkSlate: "#2D3748", // Darker gray for contrast
      dim: "#A0AEC0", // Muted gray for secondary text
    },
  },
  shadows: {
    card: "0 2px 8px rgba(0, 0, 0, 0.1)", // Define a shadow for card-like elements
  },
  components: {
    Heading: {
      baseStyle: (props) => ({
        color: props.colorMode === "dark" ? "gray.100" : "gray.900",
      }),
    },
    Text: {
      baseStyle: (props) => ({
        color: props.colorMode === "dark" ? "gray.200" : "gray.800",
        fontSize: "sm", // Match sidebar's font size
        fontWeight: "medium", // Match sidebar's font weight
      }),
    },
    Code: {
      baseStyle: (props) => ({
        bg: props.colorMode === "dark" ? "gray.700" : "gray.100",
        color: props.colorMode === "dark" ? "gray.100" : "gray.800",
        fontSize: "sm",
        p: 3,
        borderRadius: "md",
      }),
    },
    Button: {
      baseStyle: {
        fontWeight: "bold",
        borderRadius: "md",
      },
      variants: {
        primary: {
          backgroundColor: "ui.main", // Yellow accent
          color: "gray.800", // Dark text for contrast
          _hover: {
            backgroundColor: "#E6C200", // Darker yellow on hover
          },
          _disabled: {
            backgroundColor: "ui.main",
            opacity: 0.6,
          },
        },
        danger: {
          backgroundColor: "ui.danger",
          color: "ui.light",
          _hover: {
            backgroundColor: "#E32727",
          },
        },
      },
      defaultProps: {
        variant: "primary",
      },
    },
    Tabs: {
      variants: {
        enclosed: {
          tab: {
            color: "ui.dim",
            _selected: {
              color: "ui.main", // Yellow for selected tab
              fontWeight: "bold",
              borderBottomColor: "ui.main", // Yellow underline
              borderBottomWidth: "2px",
            },
            _hover: {
              color: "ui.secondary", // Light yellow on hover
            },
          },
        },
      },
    },
    Toast: {
      baseStyle: {
        container: {
          bg: "white",
          color: "gray.800",
          borderRadius: "md",
          boxShadow: "lg",
          padding: "16px",
          position: "absolute",
          top: "20px",
          transform: "translateX(-50%)",
          minWidth: "300px",
          maxWidth: "90%",
        },
      },
      variants: {
        error: {
          container: {
            bg: "red.100",
            color: "red.900",
            border: "1px solid",
            borderColor: "red.300",
          },
        },
        success: {
          container: {
            bg: "green.100",
            color: "green.900",
            border: "1px solid",
            borderColor: "green.300",
          },
        },
        info: {
          container: {
            bg: "blue.100",
            color: "blue.900",
            border: "1px solid",
            borderColor: "blue.300",
          },
        },
        warning: {
          container: {
            bg: "yellow.100",
            color: "yellow.900",
            border: "1px solid",
            borderColor: "yellow.300",
          },
        },
      },
    },
  },
});

export default theme;