import React from 'react';
import { Container, VStack, Heading } from '@chakra-ui/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/submit-form/success')({
  component: SuccessPage,
});

function SuccessPage() {
  return (
    <Container maxW="full" py={10}>
      <VStack spacing={6} align="center">
        <Heading color="green.400">Success!</Heading>
      </VStack>
    </Container>
  );
}

export default SuccessPage;