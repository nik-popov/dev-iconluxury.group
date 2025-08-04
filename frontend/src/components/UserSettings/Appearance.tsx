// src/components/Appearance.tsx
import React from "react";
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
  // Get the current color mode and the toggle function from Chakra UI
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Container maxW="full">
      <Heading size="sm" py={4}>
        Appearance
      </Heading>
      {/* The RadioGroup value is bound to the current color mode,
          and toggling a radio will trigger toggleColorMode */}
      <RadioGroup onChange={toggleColorMode} value={colorMode}>
        <Stack direction="column">
          {/* If you have configured your theme to use a custom color scheme (for example, "ui"),
              you can either update the Radio props below or remove the explicit scheme so that
              the theme defaults apply. */}
          <Radio value="dark">
            Dark Mode
          </Radio>
          <Radio value="light">
            Light Mode
            <Badge ml="1">
              Default
            </Badge>
          </Radio>
        </Stack>
      </RadioGroup>
    </Container>
  );
};

export default Appearance;