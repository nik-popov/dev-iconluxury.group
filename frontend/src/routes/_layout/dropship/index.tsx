import React, { useState, useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Text,
  VStack,
  Button,
  Flex,
  IconButton,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useToast,
  Checkbox,
} from '@chakra-ui/react';
import { FiFolder, FiFile, FiDownload, FiCopy, FiTrash2, FiUpload } from 'react-icons/fi';
import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel } from 'react-icons/fa';

// API Configuration
const API_BASE_URL = 'https://api.iconluxury.group/api/v1';
const STORAGE_TYPE = 's3';
const DEFAULT_EXPIRES_IN = 900; // 15 minutes
const FIXED_PATH = 'public/image/ecommerce/direct/';

// Interfaces
interface S3Object {
  type: 'folder' | 'file';
  name: string;
  path: string;
  size?: number;
  lastModified?: Date;
  count?: number;
}

interface S3ListResponse {
  objects: S3Object[];
  hasMore: boolean;
  nextContinuationToken: string | null;
}

// API Functions
async function listObjects(
  prefix: string,
  page: number,
  pageSize = 10,
  continuationToken: string | null = null,
  storageType: string = STORAGE_TYPE
): Promise<S3ListResponse> {
  try {
    const url = new URL(`${API_BASE_URL}/${storageType}/list`);
    url.searchParams.append('prefix', prefix);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('pageSize', pageSize.toString());
    if (continuationToken) {
      url.searchParams.append('continuation_token', continuationToken);
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 404) {
        errorMessage = `${storageType.toUpperCase()} list endpoint not found.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied to ${storageType.toUpperCase()} bucket.`;
      } else if (response.status === 503) {
        errorMessage = 'Service temporarily unavailable.';
      }
      throw new Error(`Failed to list objects: ${errorMessage}`);
    }
    const data: S3ListResponse = await response.json();
    return {
      objects: data.objects.map((item) => ({
        ...item,
        lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
      })),
      hasMore: data.hasMore,
      nextContinuationToken: data.nextContinuationToken,
    };
  } catch (error: any) {
    const message = error.message?.includes('CORS')
      ? `CORS error: Ensure the server allows requests from this origin.`
      : error.message || `Network error fetching ${storageType.toUpperCase()} objects`;
    throw new Error(message);
  }
}

async function getSignedUrl(
  key: string,
  expiresIn: number = DEFAULT_EXPIRES_IN,
  storageType: string = STORAGE_TYPE
): Promise<string> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/${storageType}/sign?key=${encodeURIComponent(key)}&expires_in=${expiresIn}`
    );
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 404) {
        errorMessage = `${storageType.toUpperCase()} sign endpoint not found.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied to generate signed URL.`;
      }
      throw new Error(`Failed to get signed URL: ${errorMessage}`);
    }
    const data = await response.json();
    return data.signedUrl;
  } catch (error: any) {
    throw new Error(`Failed to get signed URL: ${error.message || 'Network error'}`);
  }
}

async function uploadFile(
  file: File,
  path: string,
  storageType: string = STORAGE_TYPE
): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch(`${API_BASE_URL}/${storageType}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 403) {
        errorMessage = `Access denied to upload to ${storageType.toUpperCase()}.`;
      }
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }
  } catch (error: any) {
    throw new Error(`Upload failed: ${error.message || 'Network error'}`);
  }
}

async function deleteObjects(
  paths: string[],
  storageType: string = STORAGE_TYPE
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/${storageType}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || response.statusText;
      if (response.status === 403) {
        errorMessage = `Access denied to delete from ${storageType.toUpperCase()}.`;
      }
      throw new Error(`Failed to delete objects: ${errorMessage}`);
    }
  } catch (error: any) {
    throw new Error(`Deletion failed: ${error.message || 'Network error'}`);
  }
}

// Utility Functions
const getFileIcon = (name: string) => {
  const extension = (name.split('.').pop()?.toLowerCase() || '');
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <FaFileImage />;
    case 'pdf':
      return <FaFilePdf />;
    case 'doc':
    case 'docx':
      return <FaFileWord />;
    case 'xls':
    case 'xlsx':
    case 'xlsm':
      return <FaFileExcel />;
    default:
      return <FiFile />;
  }
};

const truncateName = (name: string, maxLength: number = 30) => {
  if (name.length <= maxLength) return name;
  const start = name.slice(0, Math.floor(maxLength / 2));
  const end = name.slice(-Math.floor(maxLength / 2));
  return `${start}...${end}`;
};

// FileList Component
interface FileListProps {
  objects: S3Object[];
  isFetching: boolean;
  selectedPaths: string[];
  onSelectPath: (path: string) => void;
  onDownload: (key: string) => void;
  onCopyUrl: (key: string) => void;
  onDelete: (path: string) => void;
}

const FileList: React.FC<FileListProps> = ({
  objects,
  isFetching,
  selectedPaths,
  onSelectPath,
  onDownload,
  onCopyUrl,
  onDelete,
}) => {
  return (
    <VStack spacing={4} align="stretch">
      <Flex bg="gray.100" p={2} borderRadius="md" mb={2}>
        <Box flex="0.5">
          <Checkbox
            isChecked={objects.length > 0 && objects.every((obj) => selectedPaths.includes(obj.path))}
            onChange={() => {
              objects.forEach((obj) => onSelectPath(obj.path));
            }}
            isDisabled={isFetching}
          />
        </Box>
        <Box flex="2">
          <Text fontWeight="bold">Name</Text>
        </Box>
        <Box flex="1">
          <Text fontWeight="bold">Size</Text>
        </Box>
        <Box flex="1">
          <Text fontWeight="bold">Modified</Text>
        </Box>
        <Box flex="1" textAlign="right">
          <Text fontWeight="bold">Actions</Text>
        </Box>
      </Flex>
      {objects.map((obj, index) => (
        <Box
          key={`${obj.path}-${index}`}
          p={4}
          borderWidth="1px"
          borderRadius="lg"
          borderColor="gray.200"
          bg="white"
          cursor="pointer"
          _hover={{ bg: 'gray.50' }}
        >
          <Flex justify="space-between" align="center">
            <HStack flex="0.5">
              <Checkbox
                isChecked={selectedPaths.includes(obj.path)}
                onChange={() => onSelectPath(obj.path)}
                isDisabled={isFetching}
              />
            </HStack>
            <HStack align="center" gap={2} flex="2">
              {obj.type === 'folder' ? <FiFolder /> : getFileIcon(obj.name)}
              <Box>
                <Text fontWeight="medium" color="gray.800">
                  {truncateName(obj.name, 30)}
                </Text>
                {obj.type === 'file' && (
                  <>
                    <Text fontSize="sm" color="gray.500">
                      Size: {obj.size ? (obj.size / 1024).toFixed(2) : '0'} KB
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Modified: {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '-'}
                    </Text>
                  </>
                )}
              </Box>
            </HStack>
            <Box flex="1">
              <Text fontSize="sm" color="gray.500">
                {obj.size ? (obj.size / 1024).toFixed(2) : '-'} KB
              </Text>
            </Box>
            <Box flex="1">
              <Text fontSize="sm" color="gray.500">
                {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '-'}
              </Text>
            </Box>
            <HStack flex="1" justify="flex-end">
              {obj.type === 'file' && (
                <>
                  <IconButton
                    aria-label="Download"
                    icon={<FiDownload />}
                    size="sm"
                    colorScheme="blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(obj.path);
                    }}
                    isDisabled={isFetching}
                  />
                  <IconButton
                    aria-label="Copy URL"
                    icon={<FiCopy />}
                    size="sm"
                    colorScheme="gray"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyUrl(obj.path);
                    }}
                    isDisabled={isFetching}
                  />
                </>
              )}
              <IconButton
                aria-label="Delete"
                icon={<FiTrash2 />}
                size="sm"
                colorScheme="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(obj.path);
                }}
                isDisabled={isFetching}
              />
            </HStack>
          </Flex>
        </Box>
      ))}
    </VStack>
  );
};

// Main Component
function FileExplorer() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [state, setState] = useState({
    page: 1,
    currentPath: FIXED_PATH,
  });
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching, error: listError } = useQuery<S3ListResponse, Error>({
    queryKey: ['objects', state.currentPath, state.page, continuationToken, STORAGE_TYPE],
    queryFn: () => listObjects(state.currentPath, state.page, 10, continuationToken, STORAGE_TYPE),
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, path }: { file: File; path: string }) =>
      uploadFile(file, path, STORAGE_TYPE),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects', state.currentPath] });
      toast({
        title: 'Upload Successful',
        description: 'File uploaded successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Unable to upload file.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteObjects(paths, STORAGE_TYPE),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects', state.currentPath] });
      setSelectedPaths([]);
      setDeletePath(null);
      toast({
        title: 'Deletion Successful',
        description: 'Item deleted successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Unable to delete item.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  useEffect(() => {
    if (data?.objects) {
      setObjects((prev) => {
        const newObjects = state.page === 1 ? data.objects : [...prev, ...data.objects];
        return Array.from(new Map(newObjects.map((obj) => [obj.path, obj])).values());
      });
      setHasMore(data.hasMore);
      setContinuationToken(data.nextContinuationToken);
    }
  }, [data, state.page]);

  const handleDownload = async (key: string) => {
    try {
      const url = await getSignedUrl(key, DEFAULT_EXPIRES_IN, STORAGE_TYPE);
      window.open(url, '_blank');
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Unable to generate download URL',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCopyUrl = async (key: string) => {
    try {
      const url = await getSignedUrl(key, DEFAULT_EXPIRES_IN, STORAGE_TYPE);
      await navigator.clipboard.writeText(url);
      toast({
        title: 'URL Copied',
        description: 'Public URL copied to clipboard',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Copy Failed',
        description: error.message || 'Unable to copy URL',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDelete = (path: string) => {
    setDeletePath(path);
    onDeleteOpen();
  };

  const handleSelectPath = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleLoadMore = () => {
    if (hasMore) {
      setState((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget && !dropRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'No valid files were dropped.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    files.forEach((file) => {
      const uploadPath = `${state.currentPath}${file.name}`;
      uploadMutation.mutate({ file, path: uploadPath });
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'No files were selected.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    files.forEach((file) => {
      const uploadPath = `${state.currentPath}${file.name}`;
      uploadMutation.mutate({ file, path: uploadPath });
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (listError) {
    return (
      <Container maxW="full" bg="white" color="gray.800" py={6}>
        <Text color="red.500">{listError.message}</Text>
        <Button mt={4} colorScheme="blue" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="full" bg="white" color="gray.800" py={6}>
      <Flex align="center" justify="space-between" flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="black">
            File Explorer (S3: public/image/ecommerce/direct/)
          </Text>
          <Text fontSize="sm" color="gray.600">
            Manage files in the ecommerce direct directory
          </Text>
        </Box>
        <HStack>
          <IconButton
            aria-label="Upload Files"
            icon={<FiUpload />}
            size="sm"
            colorScheme="blue"
            onClick={handleUploadClick}
            isLoading={uploadMutation.isPending}
          />
        </HStack>
      </Flex>

      <Box
        ref={dropRef}
        p={6}
        mt={4}
        mb={4}
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'green.500' : 'gray.300'}
        bg={isDragging ? 'green.100' : 'gray.100'}
        borderRadius="lg"
        minH="100px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        transition="all 0.2s"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <VStack spacing={2}>
          <FiUpload size="32px" color={isDragging ? 'green.500' : 'gray.500'} />
          <Text fontSize="md" fontWeight="medium" color={isDragging ? 'green.600' : 'gray.600'}>
            {isDragging
              ? 'Drop files here to upload'
              : 'Drag and drop files or click the upload button'}
          </Text>
          {uploadMutation.isPending && (
            <Text fontSize="sm" color="blue.500">
              Uploading {uploadMutation.variables?.file.name || 'files'}...
            </Text>
          )}
        </VStack>
      </Box>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        multiple
      />

      <Box maxH="70vh" overflowY="auto">
        <FileList
          objects={objects}
          isFetching={isFetching}
          selectedPaths={selectedPaths}
          onSelectPath={handleSelectPath}
          onDownload={handleDownload}
          onCopyUrl={handleCopyUrl}
          onDelete={handleDelete}
        />
        {objects.length === 0 && !isFetching && (
          <Text fontSize="sm" color="gray.500" mt={4}>
            No items in this directory
          </Text>
        )}
        {isFetching && <Text fontSize="sm" color="gray.500" mt={4}>Loading...</Text>}
        {!isFetching && hasMore && objects.length > 0 && (
          <Button
            colorScheme="green"
            size="sm"
            onClick={handleLoadMore}
            mt={4}
            alignSelf="center"
            isDisabled={isFetching}
          >
            Load More
          </Button>
        )}
      </Box>

      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete this item? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                if (deletePath) {
                  deleteMutation.mutate([deletePath]);
                }
                onDeleteClose();
              }}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export const Route = createFileRoute('/_layout/dropship/')({
  component: FileExplorer,
});

export default FileExplorer;