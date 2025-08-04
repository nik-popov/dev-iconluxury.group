// src/components/OptimalReferencesTable.tsx
import { useState, useEffect } from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Image,
  Flex,
} from "@chakra-ui/react";

interface Reference {
  category: string;
  url: string;
}

interface ReferencesData {
  [key: string]: string;
}

const OptimalReferencesTable = () => {
  const [references, setReferences] = useState<Reference[]>([]);

  // Fetch data from the GitHub URL on component mount
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/iconluxurytoday/settings-static-data/refs/heads/main/optimal-references.json"
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json() as Promise<ReferencesData>;
      })
      .then((data) => {
        // Transform the JSON object into an array of Reference objects
        const fetchedReferences = Object.entries(data).map(
          ([category, url]) => ({
            category,
            url,
          })
        );
        setReferences(fetchedReferences);
      })
      .catch((error) => {
        console.error("Error fetching references:", error);
        setReferences([]); // Fallback to empty array on error
      });
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <Flex direction="column" p={4}>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Category</Th>
            <Th>Image URL</Th>
            <Th>Image</Th>
          </Tr>
        </Thead>
        <Tbody>
          {references.map((ref) => (
            <Tr key={ref.category}>
              <Td>{ref.category}</Td>
              <Td>{ref.url}</Td>
              <Td>
                <Image
                  src={ref.url}
                  alt={ref.category}
                  boxSize="100px"
                  objectFit="cover"
                  fallbackSrc="https://via.placeholder.com/100"
                  loading="lazy"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Flex>
  );
};

export default OptimalReferencesTable;