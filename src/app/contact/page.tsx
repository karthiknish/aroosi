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
import { submitContactPublic } from "@/lib/contactUtil";

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
      const result = await submitContactPublic(data);
      if (result.success) {
        setIsSubmitted(true);
        reset();
      } else {
        setSubmitError(
          result.error || "Failed to send message. Please try again."
        );
      }
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    }
  };

  return (
    <div className="min-h-screen bg-base-light pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Pink color pop circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl relative z-20"
      >
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-neutral relative inline-block">
            Contact Us
            <svg
              className="absolute -bottom-2 left-0 w-full"
              height="6"
              viewBox="0 0 200 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 3C50 0.5 150 0.5 200 3"
                stroke="#FDA4AF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p className="mt-2 text-lg font-sans text-neutral-light">
            We&apos;d love to hear from you! Send us a message using the form
            below.
          </p>
        </div>

        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-6 bg-primary-light border border-primary-200 rounded-lg"
          >
            <h2 className="text-2xl font-serif font-bold text-primary-700">
              Thank You!
            </h2>
            <p className="mt-2 font-sans text-primary-600">
              Your message has been sent successfully. We&apos;ll get back to
              you soon.
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              className="mt-6 bg-danger hover:bg-danger/90"
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
                className="block text-sm font-medium text-neutral mb-1"
              >
                Full Name
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Your Name"
                className={`${errors.name ? "border-danger" : ""}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="email"
                className="block text-sm font-medium text-neutral mb-1"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="you@example.com"
                className={`${errors.email ? "border-danger" : ""}`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-danger">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="subject"
                className="block text-sm font-medium text-neutral mb-1"
              >
                Subject
              </Label>
              <Input
                id="subject"
                {...register("subject")}
                placeholder="Regarding..."
                className={`${errors.subject ? "border-danger" : ""}`}
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-danger">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="message"
                className="block text-sm font-medium text-neutral mb-1"
              >
                Message
              </Label>
              <Textarea
                id="message"
                {...register("message")}
                placeholder="Your message here..."
                rows={5}
                className={`${errors.message ? "border-danger" : ""}`}
              />
              {errors.message && (
                <p className="mt-1 text-sm text-danger">
                  {errors.message.message}
                </p>
              )}
            </div>

            {submitError && (
              <p className="text-sm text-danger bg-danger/10 p-3 rounded-md">
                {submitError}
              </p>
            )}

            <div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-dark hover:bg-primary-light disabled:bg-primary-light text-white"
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
              className="text-primary-light hover:underline"
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
