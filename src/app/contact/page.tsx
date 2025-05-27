"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";

const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z
    .string()
    .min(5, { message: "Subject must be at least 5 characters." }),
  message: z
    .string()
    .min(10, { message: "Message must be at least 10 characters." }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit: SubmitHandler<ContactFormValues> = async (data) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setIsSubmitted(true);
        reset();
      } else {
        setSubmitError("Failed to send message. Please try again.");
      }
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl"
      >
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800">
            Contact Us
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            We&apos;d love to hear from you! Send us a message using the form
            below.
          </p>
        </div>

        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-6 bg-green-50 border border-green-200 rounded-lg"
          >
            <h2 className="text-2xl font-semibold text-green-700">
              Thank You!
            </h2>
            <p className="mt-2 text-green-600">
              Your message has been sent successfully. We&apos;ll get back to
              you soon.
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              className="mt-6 bg-pink-600 hover:bg-pink-700"
            >
              Send Another Message
            </Button>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div>
              <Label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Your Name"
                className={`${errors.name ? "border-red-500" : ""}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="you@example.com"
                className={`${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Subject
              </Label>
              <Input
                id="subject"
                {...register("subject")}
                placeholder="Regarding..."
                className={`${errors.subject ? "border-red-500" : ""}`}
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Message
              </Label>
              <Textarea
                id="message"
                {...register("message")}
                placeholder="Your message here..."
                rows={5}
                className={`${errors.message ? "border-red-500" : ""}`}
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.message.message}
                </p>
              )}
            </div>

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {submitError}
              </p>
            )}

            <div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </motion.form>
        )}

        <div className="mt-10 pt-8 border-t border-gray-200 text-center">
          <h3 className="text-xl font-semibold text-gray-800">
            Other ways to reach us:
          </h3>
          <p className="mt-2 text-gray-600">
            Email:{" "}
            <a
              href="mailto:contact@aroosi.co.uk"
              className="text-pink-600 hover:underline"
            >
              contact@aroosi.co.uk
            </a>
          </p>
          {/* Add physical address or phone if applicable */}
          {/* <p className="mt-1 text-gray-600">Phone: +44 XXXXXXXXXX</p> */}
          {/* <p className="mt-1 text-gray-600">123 Matrimony Lane, London, UK</p> */}
        </div>
      </motion.main>
    </div>
  );
}
