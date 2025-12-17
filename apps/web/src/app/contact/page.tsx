"use client";
import { motion } from "framer-motion";
import { fadeInUp, fadeIn } from "@/components/animation/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { submitContactPublic } from "@/lib/contactUtil";
import {
  Mail,
  Send,
  MessageSquare,
  Clock,
  ArrowRight,
  Check,
} from "lucide-react";

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
    <>
        {/* Schema.org for Organization Contact */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ContactPage",
              mainEntity: {
                "@type": "Organization",
                name: "Aroosi",
                url: "https://aroosi.app",
                contactPoint: {
                  "@type": "ContactPoint",
                  telephone: "+44-20-1234-5678",
                  email: "contact@aroosi.app",
                  contactType: "Customer Service",
                  availableLanguage: ["English", "Dari", "Pashto"],
                  hoursAvailable: "Mo-Su 00:00-23:59",
                },
              },
            }),
          }}
        />
<div className="relative min-h-screen bg-base-light">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-secondary/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />
        </div>

  <div className="relative pt-32 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-primary leading-tight font-serif"
              >
                Get in Touch
              </h1>
              <p className="text-lg sm:text-xl text-neutral-light mb-8 max-w-3xl mx-auto leading-relaxed">
                Have a question or need assistance? We&apos;re here to help.
                Reach out to us and we&apos;ll respond as quickly as possible.
              </p>
              <div className="flex justify-center space-x-8 text-sm text-neutral-light">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-success" />
                  24/7 Support
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-success" />
                  Quick Response
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-success" />
                  Friendly Team
                </span>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="bg-white shadow-xl p-8 z-10">
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-neutral-dark mb-4">
                      Message Sent Successfully!
                    </h2>
                    <p className="text-neutral-light mb-8 max-w-md mx-auto">
                      Thank you for reaching out. We&apos;ve received your
                      message and will get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => setIsSubmitted(false)}
                      className="bg-primary hover:bg-primary-dark text-white"
                    >
                      <div className="flex items-center gap-2">
                        Send Another Message
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-neutral-dark mb-2">
                        Send us a Message
                      </h2>
                      <p className="text-neutral-light">
                        Fill out the form below and we&apos;ll get back to you
                        soon
                      </p>
                    </div>

                    <motion.form
                      onSubmit={handleSubmit(onSubmit)}
                      className="space-y-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <Label
                            htmlFor="name"
                            className="block text-sm font-medium text-neutral-dark mb-2"
                          >
                            Full Name{" "}
                            <span
                              className="text-danger"
                              aria-label="required"
                            >
                              *
                            </span>
                          </Label>
                          <Input
                            id="name"
                            {...register("name")}
                            placeholder="John Doe"
                            error={!!errors.name}
                            aria-describedby={
                              errors.name ? "name-error" : undefined
                            }
                            aria-required="true"
                            className={`${errors.name ? "border-danger focus:border-danger" : "border-neutral/20 focus:border-primary"}`}
                          />
                          {errors.name && (
                            <p
                              id="name-error"
                              className="mt-1 text-sm text-danger"
                              role="alert"
                            >
                              {errors.name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label
                            htmlFor="email"
                            className="block text-sm font-medium text-neutral-dark mb-2"
                          >
                            Email Address{" "}
                            <span
                              className="text-danger"
                              aria-label="required"
                            >
                              *
                            </span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            {...register("email")}
                            placeholder="john@example.com"
                            error={!!errors.email}
                            aria-describedby={
                              errors.email ? "email-error" : undefined
                            }
                            aria-required="true"
                            className={`${errors.email ? "border-danger focus:border-danger" : "border-neutral/20 focus:border-primary"}`}
                          />
                          {errors.email && (
                            <p
                              id="email-error"
                              className="mt-1 text-sm text-danger"
                              role="alert"
                            >
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor="subject"
                          className="block text-sm font-medium text-neutral-dark mb-2"
                        >
                          Subject{" "}
                          <span className="text-danger" aria-label="required">
                            *
                          </span>
                        </Label>
                        <Input
                          id="subject"
                          {...register("subject")}
                          placeholder="How can we help?"
                          error={!!errors.subject}
                          aria-describedby={
                            errors.subject ? "subject-error" : undefined
                          }
                          aria-required="true"
                          className={`${errors.subject ? "border-danger focus:border-danger" : "border-neutral/20 focus:border-primary"}`}
                        />
                        {errors.subject && (
                          <p
                            id="subject-error"
                            className="mt-1 text-sm text-danger"
                            role="alert"
                          >
                            {errors.subject.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="message"
                          className="block text-sm font-medium text-neutral-dark mb-2"
                        >
                          Message{" "}
                          <span className="text-danger" aria-label="required">
                            *
                          </span>
                        </Label>
                        <Textarea
                          id="message"
                          {...register("message")}
                          placeholder="Tell us more about your inquiry..."
                          rows={5}
                          aria-describedby={
                            errors.message ? "message-error" : undefined
                          }
                          aria-required="true"
                          className={`${errors.message ? "border-danger focus:border-danger" : "border-neutral/20 focus:border-primary"}`}
                        />
                        {errors.message && (
                          <p
                            id="message-error"
                            className="mt-1 text-sm text-danger"
                            role="alert"
                          >
                            {errors.message.message}
                          </p>
                        )}
                      </div>

                      {submitError && (
                        <div
                          className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg"
                          role="alert"
                          aria-live="polite"
                        >
                          {submitError}
                        </div>
                      )}

                      <div>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-primary hover:bg-primary-dark text-white disabled:opacity-50"
                        >
                          <div className="flex items-center justify-center gap-2">
                            {isSubmitting ? "Sending..." : "Send Message"}
                            <Send className="w-4 h-4" aria-hidden="true" />
                          </div>
                        </Button>
                      </div>
                    </motion.form>
                  </>
                )}
              </Card>
            </motion.div>
            {/* The next motion.div for the email card follows here */}
            <motion.div
              className="max-w-2xl mx-auto mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-6 bg-white hover:shadow-xl transition-all duration-300 h-full z-10">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Mail className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-neutral-dark mb-2 text-center">
                  Email Us
                </h3>
                <p className="text-neutral-light text-center mb-4">
                  Send us an email anytime
                </p>
                <a
                  href="mailto:contact@aroosi.app"
                  className="text-primary hover:text-primary-dark font-medium text-center block hover:underline"
                >
                  contact@aroosi.app
                </a>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
