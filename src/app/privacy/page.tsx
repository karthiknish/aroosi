"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeInUp } from "@/components/animation/motion";

export default function PrivacyPage() {
  return (
    <>
      <div className="bg-base-light pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl"
        >
          <div className="text-center mb-8 sm:mb-12">
            <Link
              href="/"
              className="inline-block mb-4 text-4xl sm:text-5xl font-serif font-bold text-primary hover:text-primary-dark transition-colors"
            >
              Aroosi
            </Link>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-dark">
              Privacy Policy
            </h1>
          </div>

          <article className="prose prose-lg max-w-none text-neutral-light">
            <p className="lead">
              Your privacy is important to us. It is Aroosi&apos;s policy to
              respect your privacy regarding any information we may collect from
              you across our website and other sites we own and operate as a
              trusted Afghan matrimony platform for Afghans worldwide.
            </p>

            <h2>Mobile App Permissions (Android)</h2>
            <p>
              Our Android app requests certain permissions to provide core
              features. You can manage or revoke these at any time in your
              device settings. We only request permissions when needed and use
              them solely for the purposes described below:
            </p>
            <ul>
              <li>
                <strong>Camera (android.permission.CAMERA)</strong>: To let you
                take and upload profile photos or images shared in chats.
              </li>
              <li>
                <strong>Microphone (android.permission.RECORD_AUDIO)</strong>:
                To record and send voice messages where available.
              </li>
              <li>
                <strong>Photos/Media</strong> —<em>Read-only access</em> via
                <code>READ_MEDIA_IMAGES</code> and <code>READ_MEDIA_VIDEO</code>
                (or legacy <code>READ/WRITE_EXTERNAL_STORAGE</code> on older
                Android versions): To select and upload photos/videos to your
                profile or conversations. We do not modify or delete your media
                without your explicit action.
              </li>
              <li>
                <strong>
                  Location (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION)
                </strong>
                : Optional; used to show distance or nearby matches if you
                enable location features.
              </li>
              <li>
                <strong>Contacts (READ_CONTACTS)</strong>: Optional; if you
                choose to find friends who also use Aroosi. We will not access
                contacts without your consent.
              </li>
              <li>
                <strong>Notifications (POST_NOTIFICATIONS)</strong>: To send
                alerts for new messages, matches, and important updates. You can
                control notification preferences in system settings and in the
                app.
              </li>
              <li>
                <strong>In‑app Purchases (com.android.vending.BILLING)</strong>:
                To securely process subscriptions or premium upgrades through
                Google Play Billing.
              </li>
              <li>
                <strong>Network and Performance</strong> —<code>INTERNET</code>,{" "}
                <code>ACCESS_NETWORK_STATE</code>,<code>ACCESS_WIFI_STATE</code>
                , <code>WAKE_LOCK</code>,<code>VIBRATE</code>,{" "}
                <code>FOREGROUND_SERVICE</code>,
                <code>RECEIVE_BOOT_COMPLETED</code>, and
                <code>MODIFY_AUDIO_SETTINGS</code>: Required for core app
                functionality such as connectivity, media playback/recording,
                push notifications, and reliable background services. We do not
                collect audio or network data beyond what is necessary to
                provide these features.
              </li>
            </ul>
            <p>
              We <strong>do not</strong> request background location or overlay
              window permissions. If a feature requires additional access in the
              future, we will ask before enabling it and update this policy.
            </p>

            <h2>1. Information We Collect</h2>
            <p>
              We only ask for personal information when we truly need it to
              provide a service to you. We collect it by fair and lawful means,
              with your knowledge and consent. We also let you know why
              we&apos;re collecting it and how it will be used.
            </p>
            <p>
              The types of personal information we may collect include your
              name, email address, date of birth, location, and other details
              relevant to creating your Afghan matrimony profile and
              facilitating matches for Afghans worldwide.
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>
              We use the information we collect in various ways, including to:
            </p>
            <ul>
              <li>Provide, operate, and maintain our website</li>
              <li>Improve, personalize, and expand our website</li>
              <li>Understand and analyze how you use our website</li>
              <li>
                Develop new products, services, features, and functionality
              </li>
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
              Aroosi follows a standard procedure of using log files. These
              files log visitors when they visit websites. All hosting companies
              do this and a part of hosting services&apos; analytics. The
              information collected by log files include internet protocol (IP)
              addresses, browser type, Internet Service Provider (ISP), date and
              time stamp, referring/exit pages, and possibly the number of
              clicks. These are not linked to any information that is personally
              identifiable. The purpose of the information is for analyzing
              trends, administering the site, tracking users&apos; movement on
              the website, and gathering demographic information.
            </p>

            <h2>4. Data Security</h2>
            <p>
              We are committed to protecting the security of your personal
              information. We use a variety of security technologies and
              procedures to help protect your personal information from
              unauthorized access, use, or disclosure. However, no method of
              transmission over the Internet, or method of electronic storage,
              is 100% secure.
            </p>

            <h2>5. Your Data Protection Rights (GDPR)</h2>
            <p>
              Under GDPR and applicable data protection laws, you have various
              rights in relation to your personal data. These include the right
              to access, correct, erase, restrict processing, data portability,
              and to object to processing. If you wish to exercise any of these
              rights, please contact us.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have questions about this policy or our data practices,
              contact us at{" "}
              <a href="mailto:contact@aroosi.app">contact@aroosi.app</a>.
            </p>

            <p className="mt-8">
              This policy is effective as of {new Date().toLocaleDateString()}.
              We may update this privacy policy from time to time. We will
              notify you of any changes by posting the new privacy policy on
              this page.
            </p>
          </article>
        </motion.main>
      </div>
    </>
  );
}
