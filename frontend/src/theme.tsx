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
        fontFamily: '"Futura", "Helvetica", "Arial", sans-serif', // Updated to Futura with fallbacks
        lineHeight: "1.7",
        bg: "gray.50",
        color: "gray.800",
        padding: "20px",
      },
      ".sidebar": {
        bg: "gray.100",
        minHeight: "100vh",
        p: 4,
      },
    }),
  },
  colors: {
    ui: {
      main: "#FFD700",
      secondary: "#FFF8E1",
      success: "#38A169",
      danger: "#E53E3E",
      light: "#FFFFFF",
      dark: "#1A202C",
      darkSlate: "#2D3748",
      dim: "#A0AEC0",
    },
  },
  shadows: {
    card: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  components: {
    Heading: {
      baseStyle: (props) => ({
        color: props.colorMode === "dark" ? "gray.100" : "gray.900",
        fontFamily: '"Futura", "Helvetica", "Arial", sans-serif', // Ensure headings use Futura
      }),
    },
    Text: {
      baseStyle: (props) => ({
        color: props.colorMode === "dark" ? "gray.200" : "gray.800",
        fontSize: "sm",
        fontWeight: "medium",
        fontFamily: '"Futura", "Helvetica", "Arial", sans-serif', // Ensure text uses Futura
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
        fontFamily: '"Futura", "Helvetica", "Arial", sans-serif', // Ensure buttons use Futura
      },
      variants: {
        primary: {
          backgroundColor: "ui.main",
          color: "gray.800",
          _hover: {
            backgroundColor: "#E6C200",
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
              color: "ui.main",
              fontWeight: "bold",
              borderBottomColor: "ui.main",
              borderBottomWidth: "2px",
            },
            _hover: {
              color: "ui.secondary",
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
          fontFamily: '"Futura", "Helvetica", "Arial", sans-serif', // Ensure toasts use Futura
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