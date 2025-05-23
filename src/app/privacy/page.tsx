"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl"
      >
        <div className="text-center mb-8 sm:mb-12">
          <Link
            href="/"
            className="inline-block mb-4 text-4xl sm:text-5xl font-serif font-bold text-pink-600 hover:text-pink-700 transition-colors"
          >
            Aroosi
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800">
            Privacy Policy
          </h1>
        </div>

        <article className="prose prose-lg max-w-none text-gray-700">
          <p className="lead">
            Your privacy is important to us. It is Aroosi's policy to respect
            your privacy regarding any information we may collect from you
            across our website, [Your Website URL], and other sites we own and
            operate.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            We only ask for personal information when we truly need it to
            provide a service to you. We collect it by fair and lawful means,
            with your knowledge and consent. We also let you know why we're
            collecting it and how it will be used.
          </p>
          <p>
            The types of personal information we may collect include your name,
            email address, date of birth, location, and other details relevant
            to creating your matrimony profile and facilitating matches.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect in various ways, including to:
          </p>
          <ul>
            <li>Provide, operate, and maintain our website</li>
            <li>Improve, personalize, and expand our website</li>
            <li>Understand and analyze how you use our website</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>
              Communicate with you, either directly or through one of our
              partners, including for customer service, to provide you with
              updates and other information relating to the website, and for
              marketing and promotional purposes (with your consent)
            </li>
            <li>Process your transactions</li>
            <li>Find and prevent fraud</li>
          </ul>

          <h2>3. Log Files</h2>
          <p>
            Aroosi follows a standard procedure of using log files. These files
            log visitors when they visit websites. All hosting companies do this
            and a part of hosting services' analytics. The information collected
            by log files include internet protocol (IP) addresses, browser type,
            Internet Service Provider (ISP), date and time stamp, referring/exit
            pages, and possibly the number of clicks. These are not linked to
            any information that is personally identifiable. The purpose of the
            information is for analyzing trends, administering the site,
            tracking users' movement on the website, and gathering demographic
            information.
          </p>

          <h2>4. Data Security</h2>
          <p>
            We are committed to protecting the security of your personal
            information. We use a variety of security technologies and
            procedures to help protect your personal information from
            unauthorized access, use, or disclosure. However, no method of
            transmission over the Internet, or method of electronic storage, is
            100% secure.
          </p>

          <h2>5. Your Data Protection Rights (UK GDPR)</h2>
          <p>
            Under UK GDPR, you have various rights in relation to your personal
            data. These include the right to access, correct, erase, restrict
            processing, data portability, and to object to processing. If you
            wish to exercise any of these rights, please contact us.
          </p>

          <p className="mt-8">
            This policy is effective as of {new Date().toLocaleDateString()}. We
            may update this privacy policy from time to time. We will notify you
            of any changes by posting the new privacy policy on this page.
          </p>
        </article>
      </motion.main>
    </div>
  );
}
