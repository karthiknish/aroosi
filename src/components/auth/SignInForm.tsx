"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Min 1, as we don't set length requirement for login
});

type ErrorWithMessage = { message?: string; data?: { message?: string } };

export default function SignInForm() {
  const logInUserMutation = useMutation(api.users.logIn);
  const { logIn: authContextLogIn } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setServerError(null);
    try {
      const loginResult = await logInUserMutation({
        email: values.email,
        password: values.password,
      });

      if (loginResult && loginResult.token) {
        await authContextLogIn(loginResult.token);
        router.push("/"); // Redirect to home page or dashboard after login
      } else {
        // This case should ideally be handled by errors thrown from the mutation
        setServerError("Login failed. Please check your credentials.");
      }
    } catch (error: unknown) {
      console.error("Sign in error:", error);
      let convexErrorMessage: string | undefined = undefined;
      let errorMessage: string | undefined = undefined;
      if (
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof (error as ErrorWithMessage).data?.message === "string"
      ) {
        convexErrorMessage = (error as ErrorWithMessage).data!.message;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as ErrorWithMessage).message === "string"
      ) {
        errorMessage = (error as ErrorWithMessage).message!;
      }
      setServerError(
        convexErrorMessage || errorMessage || "An unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 w-full max-w-md"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && (
          <p className="text-sm font-medium text-destructive">{serverError}</p>
        )}
        <Button
          type="submit"
          className="w-full bg-pink-600 hover:bg-pink-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
}
