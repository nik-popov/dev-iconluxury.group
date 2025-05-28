import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      "html, body": {
        fontFamily: '"Futura", "Helvetica", "Arial", sans-serif',
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
    },
  },
  colors: {
    ui: {
      main: "#FFD700", // Gold
      secondary: "#FFF8E1", // Light cream
      success: "#38A169", // Green
      danger: "#E53E3E", // Red
      light: "#FFFFFF", // White
      dim: "#A0AEC0", // Light gray
    },
  },
  shadows: {
    card: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  components: {
    Heading: {
      baseStyle: {
        color: "gray.900",
        fontFamily: '"Futura", "Helvetica", "Arial", sans-serif',
      },
    },
    Text: {
      baseStyle: {
        color: "gray.800",
        fontSize: "sm",
        fontWeight: "medium",
        fontFamily: '"Futura", "Helvetica", "Arial", sans-serif',
      },
    },
    Code: {
      baseStyle: {
        bg: "gray.100",
        color: "gray.800",
        fontSize: "sm",
        p: 3,
        borderRadius: "md",
      },
    },
    Button: {
      baseStyle: {
        fontWeight: "bold",
        borderRadius: "md",
        fontFamily: '"Futura", "Helvetica", "Arial", sans-serif',
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
        secondary: {
          backgroundColor: "ui.secondary",
          color: "gray.800",
          _hover: {
            backgroundColor: "#F5E1E1",
          },
          _disabled: {
            backgroundColor: "ui.secondary",
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
          bg: "ui.light",
          color: "gray.700",
          borderRadius: "md",
          padding: "16px",
          position: "absolute",
          top: "20px",
          transform: "translateX(-50%)",
          minWidth: "300px",
          maxWidth: "90%",
          fontFamily: '"Futura", "Helvetica", "Arial", sans-serif',
        },
      },
      variants: {
        error: {
          container: {
            bg: "red.100",
            color: "red.800",
            border: "1px solid",
            borderColor: "red.300",
          },
        },
        success: {
          container: {
            bg: "green.100",
            color: "green.800",
            border: "1px solid",
            borderColor: "green.300",
          },
        },
        info: {
          container: {
            bg: "blue.100",
            color: "blue.800",
            border: "1px solid",
            borderColor: "blue.300",
          },
        },
        warning: {
          container: {
            bg: "yellow.100",
            color: "yellow.800",
            border: "1px solid",
            borderColor: "yellow.300",
          },
        },
      },
    },
  },
});

export default theme;