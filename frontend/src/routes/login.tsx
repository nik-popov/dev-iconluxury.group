import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons"
import {
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  Icon,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Text,
  Flex,
  useBoolean,
} from "@chakra-ui/react"
import { Link as RouterLink, createFileRoute, redirect } from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"

import Logo from "/assets/images/luxury-market-logo-svg.svg"
import type { Body_login_login_access_token as AccessToken } from "../client"
import useAuth, { isLoggedIn } from "../hooks/useAuth"
import { emailPattern } from "../utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
})

function Login() {
  const [show, setShow] = useBoolean()
  const { loginMutation, error, resetError } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { username: "", password: "" },
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  // Social media logo components
  const GitHubLogo = () => (
    <Link
      href="https://github.com/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
        alt="GitHub Logo"
        boxSize="32px"
      />
    </Link>
  )

  const LinkedInLogo = () => (
    <Link
      href="https://www.linkedin.com/company/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
        alt="LinkedIn Logo"
        boxSize="32px"
      />
    </Link>
  )

  const XLogo = () => (
    <Link
      href="https://twitter.com/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        src="/assets/images/twitter-x.svg"
        alt="X Logo"
        boxSize="32px"
      />
    </Link>
  )

  return (
    <Container
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      maxW="sm"
      p={10}
      centerContent
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      bg="gray.50" // Match Sidebar's light background
      gap={6} // Reduced gap for tighter spacing like Sidebar
    >
      <Link href="https://iconluxury.group" target="_blank" rel="noopener noreferrer">
        <Image
          src={Logo}
          alt="iconluxurygroup logo"
          height="auto"
          maxW="180px" // Match Sidebar logo size
          alignSelf="center"
          p={6} // Match Sidebar padding
        />
      </Link>
      <FormControl id="username" isInvalid={!!errors.username || !!error}>
        <Input
          id="username"
          {...register("username", {
            required: "Username is required",
            pattern: emailPattern,
          })}
          placeholder="Email"
          type="email"
          required
          bg="white" // Match Sidebar input background
          color="gray.800" // Dark text for readability
          _placeholder={{ color: "gray.400" }} // Subtle placeholder
        />
        {errors.username && (
          <FormErrorMessage>{errors.username.message}</FormErrorMessage>
        )}
      </FormControl>

      <FormControl id="password" isInvalid={!!error}>
        <InputGroup>
          <Input
            {...register("password", { required: "Password is required" })}
            type={show ? "text" : "password"}
            placeholder="Password"
            required
            bg="white"
            color="gray.800"
            _placeholder={{ color: "gray.400" }}
          />
          <InputRightElement color="gray.400" _hover={{ cursor: "pointer" }}>
            <Icon
              as={show ? ViewOffIcon : ViewIcon}
              onClick={setShow.toggle}
              aria-label={show ? "Hide password" : "Show password"}
            />
          </InputRightElement>
        </InputGroup>
        {error && <FormErrorMessage>{error}</FormErrorMessage>}
      </FormControl>

      <Link as={RouterLink} to="/recover-password" color="#FFD700" fontWeight="bold">
        Forgot password?
      </Link>

      <Button
        variant="primary"
        type="submit"
        isLoading={isSubmitting}
        w="full" // Full width for consistency
        bg="#FFD700" // Yellow accent
        color="gray.800" // Dark text for contrast
        _hover={{ bg: "#E6C200" }} // Darker yellow on hover
      >
        Log In
      </Button>

      <Text color="gray.800">
        Don't have an account?{" "}
        <Link as={RouterLink} to="/signup" color="#FFD700" fontWeight="bold">
          Sign up
        </Link>
      </Text>

      <Flex direction="row" justify="center" align="center" gap={4} mt={8}>
        <GitHubLogo />
        <LinkedInLogo />
        <XLogo />
      </Flex>
    </Container>
  )
}

export default Login