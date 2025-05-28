import { useEffect } from "react";
import {
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type SubmitHandler, useForm } from "react-hook-form";

import {
  type ApiError,
  type UserPublic as BaseUserPublic, // Rename to avoid conflict
  type UserUpdate as BaseUserUpdate,
  UsersService,
} from "../../client";
import useCustomToast from "../../hooks/useCustomToast";
import { emailPattern, handleError } from "../../utils";

// Extend UserPublic to match database schema
interface ExtendedUserPublic extends BaseUserPublic {
  has_subscription?: boolean;
  is_trial?: boolean;
  is_deactivated?: boolean;
}

interface UserUpdate extends BaseUserUpdate {
  has_subscription?: boolean;
  is_trial?: boolean;
  is_deactivated?: boolean;
}

interface EditUserProps {
  user: ExtendedUserPublic;
  isOpen: boolean;
  onClose: () => void;
}

interface UserUpdateForm extends UserUpdate {
  confirm_password: string;
}

const EditUser = ({ user, isOpen, onClose }: EditUserProps) => {
  const queryClient = useQueryClient();
  const showToast = useCustomToast();

  console.log("Initial user prop:", JSON.stringify(user, null, 2));

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      ...user,
      has_subscription: user.has_subscription || false,
      is_trial: user.is_trial || false,
      is_deactivated: user.is_deactivated || false,
    },
  });

  useEffect(() => {
    console.log("Resetting form with user:", JSON.stringify(user, null, 2));
    reset({
      ...user,
      has_subscription: user.has_subscription || false,
      is_trial: user.is_trial || false,
      is_deactivated: user.is_deactivated || false,
    });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (data: UserUpdateForm) => {
      const requestData: UserUpdate = {
        ...data,
        has_subscription: data.has_subscription || false,
        is_trial: data.is_trial || false,
        is_deactivated: data.is_deactivated || false,
      };
      delete (requestData as any).confirm_password;
      console.log("Sending to API:", JSON.stringify(requestData, null, 2));
      return UsersService.updateUser({
        userId: user.id,
        requestBody: requestData,
      });
    },
    onSuccess: (response) => {
      console.log("API response:", JSON.stringify(response, null, 2));
      showToast("Success!", "User updated successfully.", "success");
      queryClient.refetchQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err: ApiError) => {
      console.log("Mutation error:", err);
      handleError(err, showToast);
    },
    onSettled: () => {
      console.log("Invalidating users query");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const onSubmit: SubmitHandler<UserUpdateForm> = async (data) => {
    if (data.password === "") {
      data.password = undefined;
    }
    console.log("Form submitted with data:", JSON.stringify(data, null, 2));
    mutation.mutate(data);
  };

  const onCancel = () => {
    console.log("Cancel clicked, resetting form");
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "sm", md: "md" }}
      isCentered
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Edit User</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl isInvalid={!!errors.email}>
            <FormLabel htmlFor="email">Email</FormLabel>
            <Input
              id="email"
              {...register("email", {
                required: "Email is required",
                pattern: emailPattern,
              })}
              placeholder="Email"
              type="email"
            />
            {errors.email && (
              <FormErrorMessage>{errors.email.message}</FormErrorMessage>
            )}
          </FormControl>
          <FormControl mt={4}>
            <FormLabel htmlFor="name">Full name</FormLabel>
            <Input id="name" {...register("full_name")} type="text" />
          </FormControl>
          <FormControl mt={4} isInvalid={!!errors.password}>
            <FormLabel htmlFor="password">Set Password</FormLabel>
            <Input
              id="password"
              {...register("password", {
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
              placeholder="Password"
              type="password"
            />
            {errors.password && (
              <FormErrorMessage>{errors.password.message}</FormErrorMessage>
            )}
          </FormControl>
          <FormControl mt={4} isInvalid={!!errors.confirm_password}>
            <FormLabel htmlFor="confirm_password">Confirm Password</FormLabel>
            <Input
              id="confirm_password"
              {...register("confirm_password", {
                validate: (value) =>
                  value === getValues().password || "The passwords do not match",
              })}
              placeholder="Password"
              type="password"
            />
            {errors.confirm_password && (
              <FormErrorMessage>{errors.confirm_password.message}</FormErrorMessage>
            )}
          </FormControl>
          <Flex gap={4} mt={4}>
            <FormControl>
              <Checkbox {...register("is_superuser")} colorScheme="teal">
                Is superuser?
              </Checkbox>
            </FormControl>
            <FormControl>
              <Checkbox {...register("is_active")} colorScheme="teal">
                Is active?
              </Checkbox>
            </FormControl>
          </Flex>
          <Flex direction="column" mt={4} gap={2}>
            <FormControl>
              <Checkbox {...register("has_subscription")} colorScheme="teal">
              Supplier
              </Checkbox>
            </FormControl>
            <FormControl>
              <Checkbox {...register("is_trial")} colorScheme="teal">
                Limited
              </Checkbox>
            </FormControl>
            <FormControl>
              <Checkbox {...register("is_deactivated")} colorScheme="teal">
              Restricted
              </Checkbox>
            </FormControl>
          </Flex>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            isDisabled={!isDirty}
          >
            Save
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditUser;