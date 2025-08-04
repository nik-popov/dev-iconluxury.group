// src/components/Appearance.tsx
import React, { useEffect } from "react";
import {
  Badge,
  Container,
  Heading,
  Radio,
  RadioGroup,
  Stack,
  useColorMode,
} from "@chakra-ui/react";

const Appearance: React.FC = () => {
  const { colorMode, setColorMode, toggleColorMode } = useColorMode();

  // Force light mode on mount and clear localStorage
  useEffect(() => {
    setColorMode("light");
    localStorage.removeItem("chakra-ui-color-mode"); // Clear stored preference
  }, [setColorMode]);

  return (
    <Container maxW="full">
      <Heading size="sm" py={4}>
        Appearance
      </Heading>
      <RadioGroup onChange={toggleColorMode} value={colorMode}>
        <Stack direction="column">
          <Radio value="dark">Dark Mode</Radio>
          <Radio value="light">
            Light Mode
            <Badge ml="1">Default</Badge>
          </Radio>
        </Stack>
      </RadioGroup>
    </Container>
  );
};

export default Appearance;