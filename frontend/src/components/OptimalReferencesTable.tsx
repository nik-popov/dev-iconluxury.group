// src/components/OptimalReferencesTable.tsx
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
// Initial data (to be replaced with API fetch later)
const optimal_references = {
  "shoe": "https://encrypted-tbn0.gstatic.com/images?q=tbn9GcQ7MGfepTaFjpQhcNFyetjseybIRxLUe58eag&s",
  "clothing": "https://encrypted-tbn0.gstatic.com/images?q=tbn9GcTyYe3Vgmztdh089e9IHLqdPPLuE2jUtV8IZg&s",
  "pant": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStaRmmSmbuIuozGgVJa6GHuR59RuW3W8_8jA&s",
  "jeans": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjiKQ5mZWi6qnWCr6Yca5_AFinCDZXhXhiAg&s",
  "t-shirt": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyYe3Vgmztdh089e9IHLqdPPLuE2jUtV8IZg&s",
};

const OptimalReferencesTable = () => {
  // State for references and next ID
  const [references, setReferences] = useState<Reference[]>([]);
  const [nextId, setNextId] = useState(1);

  // Initialize data (replace with API fetch later)
  useEffect(() => {
    const initialReferences = Object.entries(optimal_references).map(
      ([category, url], index) => ({
        id: index + 1,
        category,
        url,
      })
    );
    setReferences(initialReferences);
    setNextId(initialReferences.length + 1);
  }, []);

  // Later, fetch from S3 via API:
  /*
  useEffect(() => {
    fetch('/api/references')
      .then(response => response.json())
      .then(data => {
        const fetchedReferences = Object.entries(data).map(([category, url], index) => ({
          id: index + 1,
          category,
          url,
        }));
        setReferences(fetchedReferences);
        setNextId(fetchedReferences.length + 1);
      })
      .catch(error => console.error('Error fetching references:', error));
  }, []);
  */

  // Handle changes
  const handleCategoryChange = (id, newCategory) => {
    setReferences((prev) =>
      prev.map((ref) =>
        ref.id === id ? { ...ref, category: newCategory } : ref
      )
    );
  };

  const handleUrlChange = (id, newUrl) => {
    setReferences((prev) =>
      prev.map((ref) => (ref.id === id ? { ...ref, url: newUrl } : ref))
    );
  };

  // Add new entry
  const handleAddNew = () => {
    setReferences((prev) => [
      ...prev,
      { id: nextId, category: "", url: "" },
    ]);
    setNextId((prev) => prev + 1);
  };

  // Delete entry
  const handleDelete = (id) => {
    setReferences((prev) => prev.filter((ref) => ref.id !== id));
  };

  // Save changes
  const handleSave = () => {
    const categories = references.map((ref) => ref.category);
    const uniqueCategories = new Set(categories);
    if (uniqueCategories.size !== categories.length) {
      alert("Duplicate categories are not allowed.");
      return;
    }
    if (references.some((ref) => !ref.category || !ref.url)) {
      alert("All fields must be filled.");
      return;
    }
    const dataToSave = Object.fromEntries(
      references.map((ref) => [ref.category, ref.url])
    );
    // Send to API (to be implemented later)
    fetch("/api/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSave),
    })
      .then((response) => {
        if (response.ok) {
          alert("Changes saved successfully.");
        } else {
          alert("Failed to save changes.");
        }
      })
      .catch((error) => console.error("Error saving references:", error));
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