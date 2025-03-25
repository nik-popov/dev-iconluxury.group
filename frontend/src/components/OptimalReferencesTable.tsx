import { useState, useEffect } from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Button,
  Flex,
  Image,
} from "@chakra-ui/react";

interface Reference {
  id: number;
  category: string;
  url: string;
}

interface ReferencesData {
  [key: string]: string;
}

const OptimalReferencesTable = () => {
  const [references, setReferences] = useState<Reference[]>([]);
  const [nextId, setNextId] = useState(1);

  // Fetch data when the component mounts
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/iconluxurygroup/settings-static-data/refs/heads/main/optimal-references.json"
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json() as Promise<ReferencesData>;
      })
      .then((data) => {
        const fetchedReferences = Object.entries(data).map(
          ([category, url], index) => ({
            id: index + 1,
            category,
            url,
          })
        );
        setReferences(fetchedReferences);
        setNextId(fetchedReferences.length + 1);
      })
      .catch((error) => {
        console.error("Error fetching references:", error);
        setReferences([]);
      });
  }, []); // Empty dependency array ensures this runs only on mount

  // Handle changes to category
  const handleCategoryChange = (id: number, newCategory: string) => {
    setReferences((prev) =>
      prev.map((ref) =>
        ref.id === id ? { ...ref, category: newCategory } : ref
      )
    );
  };

  // Handle changes to URL
  const handleUrlChange = (id: number, newUrl: string) => {
    setReferences((prev) =>
      prev.map((ref) => (ref.id === id ? { ...ref, url: newUrl } : ref))
    );
  };

  // Add a new empty entry
  const handleAddNew = () => {
    setReferences((prev) => [
      ...prev,
      { id: nextId, category: "", url: "" },
    ]);
    setNextId((prev) => prev + 1);
  };

  // Delete an entry by ID
  const handleDelete = (id: number) => {
    setReferences((prev) => prev.filter((ref) => ref.id !== id));
  };

  // Save changes to an API endpoint
  const handleSave = async () => {
    // Check for duplicate categories
    const categories = references.map((ref) => ref.category);
    const uniqueCategories = new Set(categories);
    if (uniqueCategories.size !== categories.length) {
      alert("Duplicate categories are not allowed.");
      return;
    }

    // Check for empty fields
    if (references.some((ref) => !ref.category || !ref.url)) {
      alert("All fields must be filled.");
      return;
    }

    // Convert array to object for API
    const dataToSave = Object.fromEntries(
      references.map((ref) => [ref.category, ref.url])
    );

    // Save to an API endpoint (placeholder URL)
    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (response.ok) {
        alert("Changes saved successfully.");
      } else {
        throw new Error("Failed to save changes.");
      }
    } catch (error) {
      console.error("Error saving references:", error);
      alert("An error occurred while saving changes.");
    }
  };

  return (
    <Flex direction="column" p={4}>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Category</Th>
            <Th>Image URL</Th>
            <Th>Image</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {references.map((ref) => (
            <Tr key={ref.id}>
              <Td>
                <Input
                  value={ref.category}
                  onChange={(e) => handleCategoryChange(ref.id, e.target.value)}
                  placeholder="Enter category"
                />
              </Td>
              <Td>
                <Input
                  value={ref.url}
                  onChange={(e) => handleUrlChange(ref.id, e.target.value)}
                  placeholder="Enter image URL"
                />
              </Td>
              <Td>
                <Image
                  src={ref.url}
                  alt={ref.category || "Image"}
                  boxSize="100px"
                  objectFit="cover"
                  fallbackSrc="https://via.placeholder.com/100"
                  loading="lazy"
                />
              </Td>
              <Td>
                <Button colorScheme="red" onClick={() => handleDelete(ref.id)}>
                  Delete
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Flex justify="space-between" mt={4}>
        <Button colorScheme="blue" onClick={handleAddNew}>
          Add New
        </Button>
        <Button colorScheme="green" onClick={handleSave}>
          Save Changes
        </Button>
      </Flex>
    </Flex>
  );
};

export default OptimalReferencesTable;